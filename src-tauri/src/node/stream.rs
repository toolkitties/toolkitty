use std::collections::HashMap;
use std::future::Future;
use std::sync::Arc;

use p2panda_core::{Body, Extension, Hash, Header, PublicKey};
use p2panda_store::{LogStore, MemoryStore, OperationStore};
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
        reply: oneshot::Sender<Result<(), StreamControllerError>>,
    },
    Replay {
        logs: HashMap<PublicKey, Vec<LogId>>,
        reply: oneshot::Sender<Result<(), StreamControllerError>>,
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
                        Some(ToStreamController::Replay { logs, reply }) => {
                            match controller_store.unacked(logs).await {
                                Ok(operations) => {
                                    for operation in operations {
                                        processor_tx
                                            .send(operation)
                                            .await
                                            .expect("send processor_tx");
                                    }
                                }
                                Err(err) => {
                                    reply.send(Err(err)).ok();
                                }
                            }
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

#[derive(Clone, Debug, PartialEq)]
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

#[derive(Clone, Debug, PartialEq, Serialize)]
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
#[derive(Clone, Debug, PartialEq, Serialize)]
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

impl PartialEq for StreamError {
    fn eq(&self, other: &Self) -> bool {
        self.to_string() == other.to_string()
    }
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
pub enum StreamControllerError {
    #[error("tried do ack unknown operation {0}")]
    AckedUnknownOperation(Hash),

    #[error("can't extract log id from operation {0}")]
    MissingLogId(Hash),
}

impl Serialize for StreamControllerError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type Operation<E> = (Header<E>, Option<Body>, Vec<u8>);

trait StreamControllerStore<L, E>
where
    E: p2panda_core::Extensions,
{
    type Error;

    /// Mark operation as acknowledged.
    fn ack(&self, operation_id: Hash) -> impl Future<Output = Result<(), Self::Error>>;

    /// Return all operations from given logs which have not yet been acknowledged.
    fn unacked(
        &self,
        logs: HashMap<PublicKey, Vec<L>>,
    ) -> impl Future<Output = Result<Vec<Operation<E>>, Self::Error>>;
}

#[derive(Clone, Debug)]
struct StreamMemoryStore<L, E = ()> {
    operation_store: MemoryStore<L, E>,

    /// Log-height of latest ack per log.
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

impl<L, E> StreamControllerStore<L, E> for StreamMemoryStore<L, E>
where
    L: p2panda_store::LogId + Send + Sync,
    E: p2panda_core::Extensions + Extension<L> + Send + Sync,
{
    type Error = StreamControllerError;

    async fn ack(&self, operation_id: Hash) -> Result<(), Self::Error> {
        let Ok(Some((header, _))) = self.operation_store.get_operation(operation_id).await else {
            return Err(StreamControllerError::AckedUnknownOperation(operation_id));
        };

        let mut acked = self.acked.write().await;

        let log_id: Option<L> = header.extension();
        let Some(log_id) = log_id else {
            return Err(StreamControllerError::MissingLogId(operation_id));
        };

        // Remember the "acknowledged" log-height for this log.
        acked.insert((header.public_key, log_id), header.seq_num);

        Ok(())
    }

    async fn unacked(
        &self,
        logs: HashMap<PublicKey, Vec<L>>,
    ) -> Result<Vec<Operation<E>>, Self::Error> {
        let acked = self.acked.read().await;

        let mut result = Vec::new();
        for (public_key, log_ids) in logs {
            for log_id in log_ids {
                match acked.get(&(public_key, log_id.clone())) {
                    Some(ack_log_height) => {
                        let Ok(operations) = self
                            .operation_store
                            .get_log(&public_key, &log_id, Some(*ack_log_height))
                            .await;

                        if let Some(operations) = operations {
                            for (header, body) in operations {
                                // @TODO(adz): Getting the encoded header bytes through encoding
                                // like this feels redundant and should be possible to retreive
                                // just from calling "get_log".
                                let header_bytes = header.to_bytes();
                                result.push((header, body, header_bytes));
                            }
                        }
                    }
                    None => continue,
                }
            }
        }

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use p2panda_core::{Hash, PrivateKey, PruneFlag};
    use p2panda_store::MemoryStore;
    use tokio::sync::oneshot;

    use crate::node::operation::{create_operation, CalendarId, Extensions};
    use crate::node::StreamEvent;

    use super::{StreamController, ToStreamController};

    #[tokio::test]
    async fn replay_unacked_operations() {
        let mut operation_store = MemoryStore::new();

        let (_controller, tx, mut rx) = StreamController::new(operation_store.clone());

        let private_key = PrivateKey::new();

        let calendar_id: CalendarId = Hash::new(b"Penguin's Pyjama Party").into();

        let extensions = Extensions {
            calendar_id: Some(calendar_id),
            prune_flag: PruneFlag::default(),
        };

        // Create and ingest operation 0.
        let (header, body) = create_operation(
            &mut operation_store,
            &private_key,
            extensions.clone(),
            Some(b"organize!"),
        )
        .await;
        let header_bytes = header.to_bytes();

        tx.send(ToStreamController::Ingest {
            header: header.clone(),
            body: body.clone(),
            header_bytes,
        })
        .await
        .unwrap();

        assert_eq!(
            rx.recv().await.unwrap(),
            StreamEvent::new(header.clone(), body.unwrap())
        );

        // Acknowledge operation 0.
        let (reply, reply_rx) = oneshot::channel();
        let operation_id = header.hash();
        tx.send(ToStreamController::Ack {
            operation_id,
            reply,
        })
        .await
        .unwrap();
        assert!(reply_rx.await.is_ok());

        // Ask to replay log, but don't expect anything to be sent.
        let (reply, reply_rx) = oneshot::channel();
        tx.send(ToStreamController::Ack {
            operation_id,
            reply,
        })
        .await
        .unwrap();
        assert!(reply_rx.await.is_ok());
    }
}
