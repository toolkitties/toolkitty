mod actor;
mod message;
mod operation;
mod stream;

use p2panda_core::{Hash, PrivateKey};
use p2panda_store::MemoryStore;
use thiserror::Error;
use tokio::sync::mpsc;

use crate::node::operation::{create_operation, Extensions, LogId};
use crate::node::stream::{AckError, StreamController, StreamEvent};

pub struct Node {
    private_key: PrivateKey,
    store: MemoryStore<LogId, Extensions>,
    stream: StreamController,
}

impl Node {
    pub fn new(private_key: PrivateKey) -> (Self, mpsc::Receiver<StreamEvent>) {
        let store = MemoryStore::new();
        let (stream, app_rx) = StreamController::new(store.clone());

        (
            Self {
                private_key,
                store,
                stream,
            },
            app_rx,
        )
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
}

#[derive(Debug, Error)]
pub enum PublishError {}
