use std::collections::HashMap;
use std::future::Future;
use std::sync::Arc;

use p2panda_core::{Body, Extension, Hash, Header, PublicKey};
use p2panda_store::{MemoryStore, OperationStore};
use p2panda_stream::IngestExt;
use serde::ser::SerializeStruct;
use serde::Serialize;
use thiserror::Error;
use tokio::sync::{mpsc, oneshot, RwLock};
use tokio::task::JoinHandle;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use crate::node::operation::{CalendarId, Extensions, LogId};

#[allow(clippy::large_enum_variant, dead_code)]
pub enum ToStreamController {
    Ingest {
        header: Header<Extensions>,
        body: Option<Body>,
        header_bytes: Vec<u8>,
    },
    Ack {
        operation_id: Hash,
        reply: oneshot::Sender<Result<(), AckError>>,
    },
    Replay {
        logs: Vec<LogId>,
    },
}

#[allow(dead_code)]
pub struct StreamController {
    controller_store: StreamMemoryStore<LogId, Extensions>,
    operation_store: MemoryStore<LogId, Extensions>,
    processor_handle: JoinHandle<()>,
}

impl StreamController {
    pub fn new(
        operation_store: MemoryStore<LogId, Extensions>,
    ) -> (
        Self,
        mpsc::Sender<ToStreamController>,
        mpsc::Receiver<StreamEvent>,
    ) {
        let rt = tokio::runtime::Handle::current();

        let controller_store = StreamMemoryStore::new(operation_store.clone());

        let (app_tx, app_rx) = mpsc::channel(1024);

        let (processor_tx, processor_rx) = mpsc::channel(1024);
        let processor_rx = ReceiverStream::new(processor_rx);

        let (stream_tx, mut stream_rx) = mpsc::channel(1024);

        {
            let controller_store = controller_store.clone();

            rt.spawn(async move {
                loop {
                    match stream_rx.recv().await {
                        Some(ToStreamController::Ingest {
                            header,
                            body,
                            header_bytes,
                        }) => processor_tx
                            .send((header, body, header_bytes))
                            .await
                            .expect("send processor_tx"),
                        Some(ToStreamController::Ack {
                            operation_id,
                            reply,
                        }) => {
                            let result = controller_store.ack(operation_id).await;
                            reply.send(result).ok();
                        }
                        Some(ToStreamController::Replay { logs }) => {
                            // @TODO: Implement replay logic
                        }
                        None => break,
                    }
                }
            });
        }

        let processor_handle = {
            let operation_store = operation_store.clone();

            rt.spawn(async move {
                let mut processor =
                    processor_rx
                        .ingest(operation_store, 512)
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
                controller_store,
                operation_store,
                processor_handle,
            },
            stream_tx,
            app_rx,
        )
    }
}

#[derive(Clone, Debug)]
pub struct StreamEvent {
    pub meta: EventMeta,
    pub data: EventData,
}

impl StreamEvent {
    pub fn new(header: Header<Extensions>, body: Body) -> Self {
        let json = serde_json::from_slice(&body.to_bytes()).unwrap();

        Self {
            meta: header.into(),
            data: EventData::Application(json),
        }
    }

    #[allow(dead_code)]
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
#[serde(rename_all = "camelCase")]
pub struct EventMeta {
    pub operation_id: Hash,
    pub calendar_id: CalendarId,
    pub public_key: PublicKey,
}

impl From<Header<Extensions>> for EventMeta {
    fn from(header: Header<Extensions>) -> Self {
        let calendar_id: CalendarId = header
            .extension()
            .expect("header to have calendar id extension");

        Self {
            operation_id: header.hash(),
            calendar_id,
            public_key: header.public_key,
        }
    }
}

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize)]
#[serde(untagged)]
pub enum EventData {
    Application(serde_json::Value),
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

#[allow(dead_code)]
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

#[derive(Debug, Error)]
pub enum AckError {
    #[error("tried do ack unknown operation {0}")]
    UnknownOperation(Hash),

    #[error("can't derive log id for operation {0}")]
    MissingLogId(Hash),
}

impl Serialize for AckError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

trait StreamControllerStore {
    type Error;

    fn ack(&self, operation_id: Hash) -> impl Future<Output = Result<(), Self::Error>>;
}

#[derive(Clone, Debug)]
struct StreamMemoryStore<L, E = ()> {
    operation_store: MemoryStore<L, E>,
    acked: Arc<RwLock<HashMap<(PublicKey, L), u64>>>,
}

impl<L, E> StreamMemoryStore<L, E> {
    pub fn new(operation_store: MemoryStore<L, E>) -> Self {
        Self {
            operation_store,
            acked: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl<L, E> StreamControllerStore for StreamMemoryStore<L, E>
where
    L: p2panda_store::LogId + Send + Sync,
    E: p2panda_core::Extensions + Extension<L> + Send + Sync,
{
    type Error = AckError;

    async fn ack(&self, operation_id: Hash) -> Result<(), Self::Error> {
        let Ok(Some((header, _))) = self.operation_store.get_operation(operation_id).await else {
            return Err(AckError::UnknownOperation(operation_id));
        };

        let mut acked = self.acked.write().await;

        let log_id: Option<L> = header.extension();
        let Some(log_id) = log_id else {
            return Err(AckError::MissingLogId(operation_id));
        };

        // Remember the "acknowledged" log-height for this log.
        acked.insert((header.public_key, log_id), header.seq_num);

        Ok(())
    }
}
