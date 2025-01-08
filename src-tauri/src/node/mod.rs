mod actor;
mod message;
mod operation;
mod stream;

use p2panda_core::{Hash, PrivateKey};
use p2panda_store::MemoryStore;
use tokio::sync::mpsc;

use crate::node::operation::{publish_operation, Extensions, LogId, PublishError};
use crate::node::stream::StreamController;
pub use crate::node::stream::{AckError, EventData, StreamEvent};

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
        // @TODO(adz): Currently all operations are written to the same log, of course we don't
        // want this, but this needs more thought.
        let log_id = LogId::Calendar;

        // "Forge" new operation for the node's author and append it to their log. This operation
        // gets persisted already in the store but doesn't have any other effect on the state of
        // the application yet.
        let (header, body, header_bytes) = publish_operation(
            &mut self.store,
            &log_id,
            &self.private_key,
            Some(payload),
            false,
        )
        .await?;
        let operation_hash = header.hash();

        // By ingesting the operation we trigger it for stream processing. It will already be
        // persisted at this point but the stream processor will ignore that.
        self.stream.ingest(header, body, header_bytes).await;

        Ok(operation_hash)
    }
}
