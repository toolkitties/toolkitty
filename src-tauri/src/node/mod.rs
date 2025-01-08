mod actor;
mod message;
mod operation;
mod stream;

use actor::{NodeActor, ToNodeActor};
use anyhow::Result;
use p2panda_core::{Hash, PrivateKey};
use p2panda_net::{FromNetwork, Network, NetworkBuilder, ToNetwork, TopicId};
use p2panda_store::MemoryStore;
use p2panda_sync::TopicQuery;
use thiserror::Error;
use tokio::sync::{mpsc, oneshot};

use crate::node::operation::{create_operation, Extensions, LogId};
use crate::node::stream::StreamController;

pub use crate::node::stream::{AckError, EventData, StreamEvent};

static NETWORK_ID: &str = "toolkitties";

fn network_id() -> [u8; 32] {
    Hash::new(NETWORK_ID).as_bytes().to_owned()
}

pub struct Node<T> {
    private_key: PrivateKey,
    store: MemoryStore<LogId, Extensions>,
    stream: StreamController,
    actor_inbox_tx: mpsc::Sender<ToNodeActor<T>>,
}

impl<T: TopicId + TopicQuery + 'static> Node<T> {
    pub async fn run(private_key: PrivateKey) -> Result<(Self, mpsc::Receiver<StreamEvent>)> {
        let store = MemoryStore::new();
        let (stream, app_rx) = StreamController::new(store.clone());
        let network = NetworkBuilder::new(network_id())
            .private_key(private_key.clone())
            .build()
            .await?;

        // @TODO: need to connect the stream_rx coming from the unified network event stream to the
        // stream processor.
        let (stream_tx, _stream_rx) = mpsc::channel(128);
        let (actor_inbox_tx, actor_inbox_rx) = mpsc::channel(128);

        let actor = NodeActor::new(network, stream_tx, actor_inbox_rx);
        actor.run().await?;

        Ok((
            Self {
                private_key,
                store,
                stream,
                actor_inbox_tx,
            },
            app_rx,
        ))
    }

    pub async fn ack(&mut self, operation_hash: Hash) -> Result<(), AckError> {
        self.stream.ack(operation_hash).await
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
        let operation_hash = header.hash();

        self.stream.ingest(header, body, header_bytes).await;

        Ok(operation_hash)
    }

    pub async fn subscribe_stream(
        &self,
        topic: &T,
    ) -> Result<(mpsc::Sender<ToNetwork>, oneshot::Receiver<()>)> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.actor_inbox_tx
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
        self.actor_inbox_tx
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
