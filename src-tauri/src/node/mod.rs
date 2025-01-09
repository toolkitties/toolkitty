mod actor;
mod message;
mod operation;
mod stream;

use anyhow::Result;
use futures_util::future::{MapErr, Shared};
use futures_util::{FutureExt, TryFutureExt};
use p2panda_core::{Hash, PrivateKey};
use p2panda_net::{FromNetwork, NetworkBuilder, ToNetwork, TopicId};
use p2panda_store::MemoryStore;
use p2panda_sync::TopicQuery;
use stream::ToStreamController;
use thiserror::Error;
use tokio::sync::{mpsc, oneshot};
use tokio::task::JoinError;
use tokio_util::task::AbortOnDropHandle;
use tracing::error;

use crate::node::actor::{NodeActor, ToNodeActor};
use crate::node::operation::{create_operation, Extensions, LogId};
use crate::node::stream::StreamController;
pub use crate::node::stream::{AckError, StreamEvent};

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
    pub async fn new(private_key: PrivateKey) -> Result<(Self, mpsc::Receiver<StreamEvent>)> {
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

        let network = NetworkBuilder::new(network_id())
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

    pub async fn ack(&mut self, operation_id: Hash) -> Result<(), AckError> {
        self.stream_tx
            .send(ToStreamController::Ack {})
            .await
            // @TODO: Handle error.
            .unwrap();
        Ok(())
    }

    pub async fn publish(&mut self, payload: &[u8]) -> Result<Hash, PublishError> {
        // @TODO(adz): Currently all operations are written to the same log and of course we don't
        // want this, but this needs more thought.
        let log_id = LogId::Calendar;

        // @TODO(adz): Memory stores are infallible right now but we'll switch to a SQLite-based
        // one soon and then we need to handle this error here:
        let (header, body) = create_operation(
            &mut self.store,
            &log_id,
            &self.private_key,
            Some(payload),
            false,
        )
        .await;
        let header_bytes = header.to_bytes();
        let operation_id = header.hash();

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

    pub async fn subscribe_stream(
        &self,
        topic: &T,
    ) -> Result<(mpsc::Sender<ToNetwork>, oneshot::Receiver<()>)> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.network_actor_tx
            .send(ToNodeActor::SubscribeStream {
                topic: topic.clone(),
                reply: reply_tx,
            })
            .await?;
        let result = reply_rx.await?;
        Ok(result)
    }

    pub async fn subscribe_gossip_overlay(
        &self,
        topic: T,
    ) -> Result<(
        mpsc::Sender<ToNetwork>,
        mpsc::Receiver<FromNetwork>,
        oneshot::Receiver<()>,
    )> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.network_actor_tx
            .send(ToNodeActor::SubscribeGossipOverlay {
                topic: topic.clone(),
                reply: reply_tx,
            })
            .await?;
        let result = reply_rx.await?;
        Ok(result)
    }
}

#[derive(Debug, Error)]
pub enum PublishError {}

/// Helper to construct shared `AbortOnDropHandle` coming from tokio crate.
type JoinErrToStr = Box<dyn Fn(tokio::task::JoinError) -> String + Send + Sync + 'static>;
