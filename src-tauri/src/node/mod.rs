mod actor;
mod message;
pub mod operation;
mod stream;

use anyhow::Result;
use futures_util::future::{MapErr, Shared};
use futures_util::{FutureExt, TryFutureExt};
use operation::encode_gossip_message;
use p2panda_core::{Hash, PrivateKey};
use p2panda_discovery::mdns::LocalDiscovery;
use p2panda_net::{FromNetwork, NetworkBuilder, SyncConfiguration, TopicId};
use p2panda_store::MemoryStore;
use p2panda_sync::log_sync::{LogSyncProtocol, TopicLogMap};
use p2panda_sync::TopicQuery;
use serde::Serialize;
use thiserror::Error;
use tokio::sync::{mpsc, oneshot};
use tokio::task::JoinError;
use tokio_util::task::AbortOnDropHandle;
use tracing::error;

use crate::node::actor::{NodeActor, ToNodeActor};
use crate::node::operation::{create_operation, Extensions, LogId};
pub use crate::node::stream::{AckError, StreamEvent};
use crate::node::stream::{StreamController, ToStreamController};

fn network_id() -> [u8; 32] {
    Hash::new(b"toolkitty").into()
}

pub struct Node<T> {
    private_key: PrivateKey,
    store: MemoryStore<LogId, Extensions>,
    #[allow(dead_code)]
    stream: StreamController,
    stream_tx: mpsc::Sender<ToStreamController>,
    network_actor_tx: mpsc::Sender<ToNodeActor<T>>,
    #[allow(dead_code)]
    actor_handle: Shared<MapErr<AbortOnDropHandle<()>, JoinErrToStr>>,
}

impl<T: TopicId + TopicQuery + 'static> Node<T> {
    pub async fn new<TM: TopicLogMap<T, LogId> + 'static>(
        private_key: PrivateKey,
        topic_map: TM,
    ) -> Result<(Self, mpsc::Receiver<StreamEvent>)> {
        let rt = tokio::runtime::Handle::current();

        let store = MemoryStore::new();
        let (stream, stream_tx, stream_rx) = StreamController::new(store.clone());
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

        let mdns = LocalDiscovery::new()?;

        let sync_protocol = LogSyncProtocol::new(topic_map, store.clone());
        let sync_config = SyncConfiguration::new(sync_protocol);

        let network = NetworkBuilder::new(network_id())
            .discovery(mdns)
            .sync(sync_config)
            .private_key(private_key.clone())
            .build()
            .await?;

        let (network_actor_tx, network_actor_rx) = mpsc::channel(64);
        let actor = NodeActor::new(network, network_tx, network_actor_rx);

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
        ))
    }

    pub async fn ack(&mut self, _operation_id: Hash) -> Result<(), AckError> {
        self.stream_tx
            .send(ToStreamController::Ack {})
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
        log_id: LogId,
        payload: &[u8],
    ) -> Result<Hash, PublishError> {
        // @TODO(adz): Memory stores are infallible right now but we'll switch to a SQLite-based
        // one soon and then we need to handle this error here:
        let (header, body) = create_operation(
            &mut self.store,
            log_id,
            &self.private_key,
            Some(payload),
            false,
        )
        .await;
        let header_bytes = header.to_bytes();
        let operation_id = header.hash();

        let bytes = encode_gossip_message(&header, body.as_ref())?;
        self.network_actor_tx
            .send(ToNodeActor::Broadcast {
                topic_id: topic.id(),
                bytes,
            })
            .await
            // @TODO: Handle error.
            .unwrap();

        self.stream_tx
            .send(ToStreamController::Ingest {
                header,
                body,
                header_bytes,
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

    pub async fn subscribe(
        &self,
        topic: T,
    ) -> Result<(mpsc::Receiver<FromNetwork>, oneshot::Receiver<()>)> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.network_actor_tx
            .send(ToNodeActor::Subscribe {
                topic: topic.clone(),
                reply: reply_tx,
            })
            .await?;
        let (_tx, rx, ready) = reply_rx.await?;
        Ok((rx, ready))
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
