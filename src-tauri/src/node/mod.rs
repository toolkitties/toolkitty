mod actor;
pub mod extensions;
pub mod operation;
pub mod stream;

use std::collections::HashMap;

use anyhow::Result;
use extensions::{Extensions, LogId};
use futures_util::future::{MapErr, Shared};
use futures_util::{FutureExt, TryFutureExt};
use p2panda_core::{Body, Hash, Header, PrivateKey, PublicKey};
use p2panda_discovery::mdns::LocalDiscovery;
use p2panda_net::{NetworkBuilder, SyncConfiguration, SystemEvent, TopicId};
use p2panda_store::MemoryStore;
use p2panda_sync::log_sync::{LogSyncProtocol, TopicLogMap};
use p2panda_sync::TopicQuery;
use serde::Serialize;
use thiserror::Error;
use tokio::sync::{broadcast, mpsc, oneshot};
use tokio::task::JoinError;
use tokio_util::task::AbortOnDropHandle;
use tracing::error;

use crate::node::actor::{NodeActor, ToNodeActor};
use crate::node::operation::encode_gossip_message;
use crate::node::stream::{StreamController, ToStreamController};
pub use crate::node::stream::{StreamControllerError, StreamEvent};

fn network_id() -> [u8; 32] {
    Hash::new(b"toolkitty").into()
}

pub struct Node<T> {
    pub private_key: PrivateKey,
    pub store: MemoryStore<LogId, Extensions>,
    #[allow(dead_code)]
    stream: StreamController,
    stream_tx: mpsc::Sender<ToStreamController>,
    network_actor_tx: mpsc::Sender<ToNodeActor<T>>,
    #[allow(dead_code)]
    actor_handle: Shared<MapErr<AbortOnDropHandle<()>, JoinErrToStr>>,
}

impl<T> Node<T>
where
    T: TopicId + TopicQuery + 'static,
{
    pub async fn new<TM: TopicLogMap<T, LogId> + 'static>(
        private_key: PrivateKey,
        store: MemoryStore<LogId, Extensions>,
        topic_map: TM,
    ) -> Result<(
        Self,
        mpsc::Receiver<StreamEvent>,
        broadcast::Receiver<SystemEvent<T>>,
    )> {
        let rt = tokio::runtime::Handle::current();

        let (stream, stream_tx, stream_rx) = StreamController::new(store.clone());
        let (ephemeral_tx, mut ephemeral_rx) = mpsc::channel(1024);

        let (network_tx, mut network_rx) = mpsc::channel(1024);

        {
            let stream_tx = stream_tx.clone();
            rt.spawn(async move {
                while let Some((header, body, header_bytes)) = network_rx.recv().await {
                    stream_tx
                        .send(ToStreamController::Ingest {
                            header,
                            body,
                            header_bytes,
                        })
                        .await
                        .expect("send stream_tx");
                }
            });
        }

        {
            let stream_tx = stream_tx.clone();
            rt.spawn(async move {
                while let Some(bytes) = ephemeral_rx.recv().await {
                    stream_tx
                        .send(ToStreamController::Ephemeral { bytes })
                        .await
                        .expect("send stream_tx");
                }
            });
        }

        let mdns = LocalDiscovery::new();

        let sync_protocol = LogSyncProtocol::new(topic_map, store.clone());
        let sync_config = SyncConfiguration::new(sync_protocol);

        let network = NetworkBuilder::new(network_id())
            .discovery(mdns)
            .sync(sync_config)
            .private_key(private_key.clone())
            .build()
            .await?;

        let system_events_rx = network.events().await?;

        let (network_actor_tx, network_actor_rx) = mpsc::channel(64);
        let actor = NodeActor::new(network, network_tx, ephemeral_tx, network_actor_rx);

        let actor_handle = rt.spawn(async {
            if let Err(err) = actor.run().await {
                error!("node actor failed: {err:?}");
            }
        });

        let actor_drop_handle = AbortOnDropHandle::new(actor_handle)
            .map_err(Box::new(|err: JoinError| err.to_string()) as JoinErrToStr)
            .shared();

        Ok((
            Self {
                private_key,
                store,
                stream,
                stream_tx,
                network_actor_tx,
                actor_handle: actor_drop_handle,
            },
            stream_rx,
            system_events_rx,
        ))
    }

    /// Acknowledge operations to mark them as successfully processed in the stream controller.
    pub async fn ack(&mut self, operation_id: Hash) -> Result<(), StreamControllerError> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.stream_tx
            .send(ToStreamController::Ack {
                operation_id,
                reply: reply_tx,
            })
            .await
            .expect("send stream_tx");
        reply_rx.await.expect("receive reply_rx")
    }

    /// Send all unacknowledged operations again on the stream which belong to these logs.
    pub async fn replay(
        &mut self,
        logs: HashMap<PublicKey, Vec<LogId>>,
    ) -> Result<(), StreamControllerError> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.stream_tx
            .send(ToStreamController::Replay {
                logs,
                reply: reply_tx,
            })
            .await
            .expect("send stream_tx");
        reply_rx.await.expect("receive reply_rx")
    }

    /// Ingest an operation without publishing it.
    pub async fn ingest(
        &mut self,
        header: &Header<Extensions>,
        body: Option<&Body>,
    ) -> Result<(), PublishError> {
        let header_bytes = header.to_bytes();

        self.stream_tx
            .send(ToStreamController::Ingest {
                header: header.to_owned(),
                body: body.cloned(),
                header_bytes,
            })
            .await
            // @TODO: Handle error.
            .unwrap();

        Ok(())
    }

    pub async fn publish_ephemeral(
        &mut self,
        topic: &T,
        payload: &[u8],
    ) -> Result<(), PublishError> {
        self.network_actor_tx
            .send(ToNodeActor::Broadcast {
                topic_id: topic.id(),
                bytes: payload.to_vec(),
            })
            .await
            // @TODO: Handle error.
            .unwrap();
        Ok(())
    }

    pub async fn publish_to_stream(
        &mut self,
        topic: &T,
        header: &Header<Extensions>,
        body: Option<&Body>,
    ) -> Result<Hash, PublishError> {
        let operation_id = header.hash();

        let bytes = encode_gossip_message(header, body)?;

        self.ingest(header, body)
            .await
            // @TODO: Handle error.
            .unwrap();

        self.network_actor_tx
            .send(ToNodeActor::Broadcast {
                topic_id: topic.id(),
                bytes,
            })
            .await
            // @TODO: Handle error.
            .unwrap();

        Ok(operation_id)
    }

    pub async fn subscribe_processed(&self, topic: &T) -> Result<()> {
        self.network_actor_tx
            .send(ToNodeActor::SubscribeProcessed {
                topic: topic.clone(),
            })
            .await?;
        Ok(())
    }

    pub async fn subscribe_ephemeral(&self, topic: &T) -> Result<()> {
        self.network_actor_tx
            .send(ToNodeActor::Subscribe {
                topic: topic.clone(),
            })
            .await?;
        Ok(())
    }
}

#[derive(Debug, Error)]
pub enum PublishError {
    #[error(transparent)]
    EncodeError(#[from] p2panda_core::cbor::EncodeError),
}

impl Serialize for PublishError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Helper to construct shared `AbortOnDropHandle` coming from tokio crate.
type JoinErrToStr = Box<dyn Fn(tokio::task::JoinError) -> String + Send + Sync + 'static>;
