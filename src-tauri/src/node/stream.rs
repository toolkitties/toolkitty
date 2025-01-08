use p2panda_core::{Body, Hash, Header, PublicKey};
use p2panda_store::MemoryStore;
use p2panda_stream::IngestExt;
use serde::ser::SerializeStruct;
use serde::Serialize;
use thiserror::Error;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use crate::node::operation::{Extensions, LogId};

#[derive(Clone, Debug)]
pub struct StreamEvent {
    pub meta: EventMeta,
    pub data: EventData,
}

impl StreamEvent {
    pub fn new(header: Header<Extensions>, body: Body) -> Self {
        Self {
            meta: header.into(),
            data: EventData::Application(body),
        }
    }

    pub fn from_error(error: StreamError, header: Header<Extensions>) -> Self {
        Self {
            meta: header.into(),
            data: EventData::Error(error),
        }
    }
}

impl Serialize for StreamEvent {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("StreamEvent", 3)?;
        state.serialize_field("event", &self.data.tag())?;
        state.serialize_field("meta", &self.meta)?;
        state.serialize_field("data", &self.data)?;
        state.end()
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct EventMeta {
    pub operation_id: Hash,
    pub public_key: PublicKey,
}

impl From<Header<Extensions>> for EventMeta {
    fn from(header: Header<Extensions>) -> Self {
        Self {
            operation_id: header.hash(),
            public_key: header.public_key,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(untagged)]
pub enum EventData {
    Application(Body),
    Error(StreamError),
}

impl EventData {
    fn tag(&self) -> &'static str {
        match self {
            EventData::Application(_) => "application",
            EventData::Error(_) => "error",
        }
    }
}

#[derive(Clone, Debug, Error)]
pub enum StreamError {
    #[error(transparent)]
    IngestError(p2panda_stream::operation::IngestError),
}

impl Serialize for StreamError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub struct StreamController {
    store: MemoryStore<LogId, Extensions>,
    processor_tx: mpsc::Sender<(Header<Extensions>, Option<Body>, Vec<u8>)>,
    processor_handle: JoinHandle<()>,
}

impl StreamController {
    pub fn new(store: MemoryStore<LogId, Extensions>) -> (Self, mpsc::Receiver<StreamEvent>) {
        let (app_tx, app_rx) = mpsc::channel(1024);
        let (processor_tx, processor_rx) = mpsc::channel(1024);
        let processor_rx = ReceiverStream::new(processor_rx);

        let processor_handle = {
            let store = store.clone();

            let rt = tokio::runtime::Handle::current();
            rt.spawn(async move {
                let mut processor =
                    processor_rx
                        .ingest(store, 512)
                        .filter_map(|result| match result {
                            Ok(operation) => Some(operation),
                            Err(_err) => {
                                // @TODO(adz): Which errors do we want to report to the application and
                                // which not? It might become pretty spammy in some cases and I'm not sure
                                // if the frontend can do anything about it?

                                // app_tx
                                //     .blocking_send(StreamEvent::from_error(
                                //         StreamError::IngestError(err),
                                //         // @TODO: We should be able to get the operation causing the error.
                                //         result.header,
                                //     ))
                                //     .expect("app_tx send");
                                None
                            }
                        });

                loop {
                    match processor.next().await {
                        Some(operation) => {
                            // If the operation has a body we want to forward it to the application
                            // layer as it might contain more information relevant for it.
                            if let Some(body) = operation.body {
                                app_tx
                                    .send(StreamEvent::new(operation.header, body))
                                    .await
                                    .expect("app_tx send");
                            }
                        }
                        None => {
                            // @TODO(adz): Panicking here probably doesn't make any sense, I'll keep it
                            // here until I understand the error handling better.
                            panic!("processor stream ended");
                        }
                    }
                }
            })
        };

        (
            Self {
                store,
                processor_tx,
                processor_handle,
            },
            app_rx,
        )
    }

    pub async fn ingest(
        &mut self,
        header: Header<Extensions>,
        body: Option<Body>,
        raw_header: Vec<u8>,
    ) {
        self.processor_tx
            .send((header, body, raw_header))
            .await
            .expect("processor_tx send");
    }

    pub async fn ack(&mut self, _operation_id: Hash) -> Result<(), AckError> {
        // @TODO: Inform controller that we've acked this operation.
        Ok(())
    }

    /// Returns true if there's been un-acked operations which will be replayed for the stream
    /// processors. Returns false if there's no work to do.
    pub async fn replay(&mut self) -> bool {
        false
    }
}

#[derive(Debug, Error)]
pub enum AckError {}
