use std::collections::HashMap;
use std::sync::Arc;

use futures_util::future::Shared;
use futures_util::FutureExt;
use p2panda_core::{Hash, PrivateKey, PublicKey};
use p2panda_net::{FromNetwork, SystemEvent, TopicId};
use p2panda_store::MemoryStore;
use p2panda_sync::log_sync::TopicLogMap;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use thiserror::Error;
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};
use tracing::debug;

use crate::messages::{ChannelEvent, NetworkEvent};
use crate::node::extensions::{CalendarId, Extensions, LogId, StreamName, StreamType};
use crate::node::operation::create_operation;
use crate::node::{Node, StreamEvent};
use crate::topic::{NetworkTopic, TopicMap, TopicType};

/// Shared application context which can be accessed from within the main application runtime loop
/// as well as any tauri command.
pub struct Context {
    /// Local p2panda node.
    pub node: Node<NetworkTopic>,

    /// Currently selected calendar.
    pub selected_calendar: Option<CalendarId>,

    /// All topics we have subscribed to.
    pub subscriptions: HashMap<[u8; 32], NetworkTopic>,

    /// Channel for sending messages to the frontend application. Messages are forwarded on the
    /// main event channel and will be received by the channel processor on the frontend.
    pub to_app_tx: broadcast::Sender<ChannelEvent>,

    /// Sync protocol topic map.
    pub topic_map: TopicMap,

    /// Channel for sending the actual tauri channel where all backend->frontend events are sent.
    /// We need this so that when the `init` command is called with the channel as an argument it
    /// can be forwarded into the main application service task which is waiting for it.
    pub channel_tx: mpsc::Sender<broadcast::Sender<ChannelEvent>>,

    /// Flag indicating that we already received a channel from the frontend (init was already
    /// called). There is a bug if `init` is called twice.
    pub channel_set: bool,
}

impl Context {
    pub fn new(
        node: Node<NetworkTopic>,
        to_app_tx: broadcast::Sender<ChannelEvent>,
        topic_map: TopicMap,
        channel_tx: mpsc::Sender<broadcast::Sender<ChannelEvent>>,
    ) -> Self {
        Self {
            node,
            selected_calendar: None,
            subscriptions: HashMap::new(),
            to_app_tx,
            topic_map: topic_map.clone(),
            channel_tx,
            channel_set: false,
        }
    }
}

pub struct Service {
    /// Handle onto the tauri application. The shared Context can be accessed and modified here.
    context: Arc<Mutex<Context>>,

    /// Stream where we receive all topic events from the p2panda node.
    stream_rx: mpsc::Receiver<StreamEvent>,

    /// Channel where we receive messages from the dedicated invite codes topic.
    invite_codes_rx: mpsc::Receiver<FromNetwork>,

    /// Ready signal for the invite codes topic.
    invite_codes_ready: Shared<oneshot::Receiver<()>>,

    /// Channel where we receive network status events from the p2panda node.
    network_events_rx: broadcast::Receiver<SystemEvent<NetworkTopic>>,

    /// Channel where we receive messages which should be forwarded up to the frontend.
    to_app_rx: broadcast::Receiver<ChannelEvent>,

    /// Channel where we receive the actual backend->frontend event channel.
    channel_rx: mpsc::Receiver<broadcast::Sender<ChannelEvent>>,
}

impl Service {
    /// Construct node, context and channels required for running the app service. Already
    /// subscribe to the invite codes topic.
    ///
    /// The node and several channel senders are added to the shared app context while channel
    /// receivers are stored on the Service struct for use during the runtime loop.
    pub async fn build() -> anyhow::Result<Self> {
        let private_key = PrivateKey::new();
        let store = MemoryStore::new();
        let topic_map = TopicMap::new();

        let (node, stream_rx, network_events_rx) =
            Node::new(private_key.clone(), store.clone(), topic_map.clone()).await?;

        let (invite_codes_rx, invite_codes_ready) =
            node.subscribe(NetworkTopic::InviteCodes).await?;
        let shared_invite_codes_ready = invite_codes_ready.shared();

        let (to_app_tx, to_app_rx) = broadcast::channel(32);
        let (channel_tx, channel_rx) = mpsc::channel(32);

        let context = Context::new(node, to_app_tx, topic_map, channel_tx);

        Ok(Self {
            context: Arc::new(Mutex::new(context)),
            stream_rx,
            invite_codes_rx,
            invite_codes_ready: shared_invite_codes_ready,
            network_events_rx,
            to_app_rx,
            channel_rx,
        })
    }

    /// Spawn the service task.
    #[cfg(not(test))]
    pub fn run(app_handle: AppHandle) {
        tauri::async_runtime::spawn(async move {
            let mut app = Self::build().await.expect("build stream");
            let rpc = Rpc {
                context: app.context.clone(),
            };
            app_handle.manage(rpc);
            let channel = app.recv_channel().await.expect("receive on channel rx");
            app.spawn_invite_code_ready_watcher(channel.clone());
            app.inner_run(channel).await.expect("run stream task");
        });
    }

    /// Spawn the service task.
    #[cfg(test)]
    pub async fn run() -> Arc<Mutex<Context>> {
        let mut app = Self::build().await.expect("build stream");
        let context = app.context.clone();
        let rt = tokio::runtime::Handle::current();

        rt.spawn(async move {
            let channel = app.recv_channel().await.expect("receive on channel rx");
            app.spawn_invite_code_ready_watcher(channel.clone());
            app.inner_run(channel).await.expect("run stream task");
        });

        context
    }

    /// Run the inner service loop which awaits events arriving on the app, network, stream and
    /// invite codes channels.
    pub(crate) async fn inner_run(
        mut self,
        channel: broadcast::Sender<ChannelEvent>,
    ) -> anyhow::Result<()> {
        loop {
            tokio::select! {
                Ok(event) = self.to_app_rx.recv() => {
                    channel.send(event)?;
                }
                Ok(event) = self.network_events_rx.recv() => {
                    channel.send(ChannelEvent::NetworkEvent(NetworkEvent(event)))?;
                },
                Some(event) = self.stream_rx.recv() => {
                    let StreamEvent { meta, .. } = &event;
                    let context = self.context.lock().await;

                    // Check if the event is associated with the currently selected calendar. We
                    // only forward it up to the application if it is.
                    //
                    // @TODO: This is filtering out the operations _after_ they've been processed
                    // by the backend. We should go through the whole processing pipeline when
                    // selected and not at all when not.
                    if let Some(ref selected_calendar) = context.selected_calendar {
                        if selected_calendar != &meta.calendar_id {
                            debug!("ignoring stream event: calendar not selected");
                            continue;
                        };
                        channel.send(ChannelEvent::Stream(event))?;
                    }
                },
                Some(event) = self.invite_codes_rx.recv() => {
                    let json = match event {
                        FromNetwork::GossipMessage { bytes, .. } => {
                            serde_json::from_slice(&bytes)?
                        },
                        FromNetwork::SyncMessage { .. } => unreachable!(),
                    };
                    channel.send(ChannelEvent::InviteCodes(json))?;
                }
            }
        }
    }

    async fn recv_channel(&mut self) -> anyhow::Result<broadcast::Sender<ChannelEvent>> {
        let Some(channel) = self.channel_rx.recv().await else {
            return Err(anyhow::anyhow!("channel tx closed"));
        };

        self.context.lock().await.channel_set = true;

        Ok(channel)
    }

    fn spawn_invite_code_ready_watcher(&self, channel: broadcast::Sender<ChannelEvent>) {
        let rt = tokio::runtime::Handle::current();
        let invite_codes_ready = self.invite_codes_ready.clone();
        rt.spawn(async move {
            invite_codes_ready
                .await
                .expect("invite codes ready channel open");
            channel
                .send(ChannelEvent::InviteCodesReady)
                .expect("channel receiver not dropped");
        });
    }
}

pub struct Rpc {
    context: Arc<Mutex<Context>>,
}

impl Rpc {
    /// Initialize the app by passing it a channel from the frontend.
    pub async fn init(&self, channel: broadcast::Sender<ChannelEvent>) -> Result<(), RpcError> {
        let context = self.context.lock().await;
        if context.channel_set {
            return Err(RpcError::SetStreamChannel);
        }

        if context.channel_tx.send(channel).await.is_err() {
            return Err(RpcError::OneshotChannel);
        };

        Ok(())
    }

    /// The public key of the local node.
    pub async fn public_key(&self) -> Result<PublicKey, RpcError> {
        let context = self.context.lock().await;
        let public_key = context.node.private_key.public_key();
        Ok(public_key)
    }

    /// Acknowledge operations to mark them as successfully processed in the stream controller.
    pub async fn ack(&self, operation_id: Hash) -> Result<(), RpcError> {
        let mut context = self.context.lock().await;
        context.node.ack(operation_id).await?;
        Ok(())
    }

    /// Add an author to a calendar.
    ///
    /// This means that we will actively sync operations from this author for the specific calendar.
    pub async fn add_topic_log(
        &self,
        public_key: PublicKey,
        calendar_id: CalendarId,
        topic_type: TopicType,
        stream_name: StreamName,
    ) -> Result<(), RpcError> {
        let context = self.context.lock().await;

        let topic = match topic_type {
            TopicType::Inbox => NetworkTopic::CalendarInbox { calendar_id },
            TopicType::Data => NetworkTopic::CalendarData { calendar_id },
        };

        let log_id = LogId {
            calendar_id,
            stream_name,
        };

        context.topic_map.add_log(topic, public_key, log_id).await;
        Ok(())
    }

    /// Subscribe to a specific calendar by it's id.
    pub async fn subscribe(
        &self,
        calendar_id: CalendarId,
        topic_type: TopicType,
    ) -> Result<(), RpcError> {
        let mut context = self.context.lock().await;

        let topic = match topic_type {
            TopicType::Inbox => NetworkTopic::CalendarInbox { calendar_id },
            TopicType::Data => NetworkTopic::CalendarData { calendar_id },
        };

        if context
            .subscriptions
            .insert(topic.id(), topic.clone())
            .is_none()
        {
            context
                .node
                .subscribe_processed(&topic)
                .await
                .expect("can subscribe to topic");

            context
                .to_app_tx
                .send(ChannelEvent::SubscribedToCalendar(calendar_id, topic_type))?;
        }

        Ok(())
    }

    /// Select a calendar we have already subscribed to.
    ///
    /// Calling this method causes all events for calendars other than the selected one to be filtered
    /// out of the channel stream. The frontend will only receive events of the selected calendar.
    ///
    /// Any operations which arrived at the node since we last selected this calendar will be replayed.
    pub async fn select_calendar(&self, calendar_id: CalendarId) -> Result<(), RpcError> {
        let mut context = self.context.lock().await;
        context.selected_calendar = Some(calendar_id);

        context
            .to_app_tx
            .send(ChannelEvent::CalendarSelected(calendar_id))?;

        // Ask stream controller to re-play all operations from logs inside this topic which haven't
        // been acknowledged yet by the frontend.
        if let Some(logs) = context
            .topic_map
            .get(&NetworkTopic::CalendarInbox { calendar_id })
            .await
        {
            context.node.replay(logs).await?;
        }

        if let Some(logs) = context
            .topic_map
            .get(&NetworkTopic::CalendarData { calendar_id })
            .await
        {
            context.node.replay(logs).await?;
        }

        Ok(())
    }

    /// Publish an event to a calendar topic.
    ///
    /// Returns the hash of the operation on which the payload was encoded.
    pub async fn publish(
        &self,
        payload: Vec<u8>,
        topic_type: TopicType,
        calendar_id: Option<CalendarId>,
        stream_name: Option<StreamName>,
        stream_type: Option<StreamType>,
    ) -> Result<Hash, RpcError> {
        let mut context = self.context.lock().await;
        let private_key = context.node.private_key.clone();

        let extensions = Extensions {
            calendar_id,
            stream_name,
            stream_type,
            ..Default::default()
        };

        let (header, body) = create_operation(
            &mut context.node.store,
            &private_key,
            extensions,
            Some(&payload),
        )
        .await;

        let calendar_id = header.extension().expect("get calendar id extension");

        let topic = match topic_type {
            TopicType::Inbox => NetworkTopic::CalendarInbox { calendar_id },
            TopicType::Data => NetworkTopic::CalendarData { calendar_id },
        };

        context
            .node
            .publish_to_stream(&topic, &header, body.as_ref())
            .await?;

        debug!("publish operation: {}", header.hash());

        Ok(header.hash())
    }

    /// Publish an invite code to onto the invite overlay network.
    pub async fn publish_to_invite_code_overlay(&self, payload: Vec<u8>) -> Result<(), RpcError> {
        let mut context = self.context.lock().await;
        context
            .node
            .publish_ephemeral(&NetworkTopic::InviteCodes, &payload)
            .await?;
        Ok(())
    }
}

#[derive(Debug, Error)]
pub enum RpcError {
    #[error("oneshot channel receiver closed")]
    OneshotChannel,

    #[error("stream channel already set")]
    SetStreamChannel,

    #[error(transparent)]
    StreamController(#[from] crate::node::StreamControllerError),

    #[error(transparent)]
    Publish(#[from] crate::node::PublishError),

    #[error("payload decoding failed")]
    Serde(#[from] serde_json::Error),

    #[error("sending message on channel failed")]
    ChannelSender(#[from] tokio::sync::broadcast::error::SendError<ChannelEvent>),
}

impl Serialize for RpcError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[cfg(test)]
mod tests {
    use p2panda_core::{Hash, PrivateKey};
    use serde_json::json;
    use tokio::sync::broadcast;

    use crate::{
        messages::{ChannelEvent, NetworkEvent},
        node::{
            extensions::{CalendarId, StreamName, StreamType},
            stream::{EventData, EventMeta},
            StreamEvent,
        },
        topic::{NetworkTopic, TopicType},
    };

    use super::{Rpc, Service};

    #[tokio::test]
    async fn public_key() {
        let context = Service::run().await;
        let node_private_key = context.lock().await.node.private_key.clone();
        let rpc = Rpc { context };

        let (channel_tx, _channel_rx) = broadcast::channel(10);
        let result = rpc.init(channel_tx).await;
        assert!(result.is_ok());

        let result = rpc.public_key().await;
        assert!(result.is_ok());
        let public_key = result.unwrap();
        assert_eq!(public_key, node_private_key.public_key());
    }

    #[tokio::test]
    async fn subscribe() {
        let context = Service::run().await;
        let rpc = Rpc { context };

        let (channel_tx, mut channel_rx) = broadcast::channel(10);
        let result = rpc.init(channel_tx).await;
        assert!(result.is_ok());

        let private_key = PrivateKey::new();
        let calendar_stream = StreamName {
            owner: private_key.public_key(),
            name: "my_unique_calendar".to_string(),
        };

        let result = rpc
            .subscribe(calendar_stream.hash().into(), TopicType::Data)
            .await;
        assert!(result.is_ok());

        let event = channel_rx.recv().await.unwrap();
        match event {
            ChannelEvent::SubscribedToCalendar(calendar_id, topic_type) => {
                let expected_calendar_id: CalendarId = calendar_stream.hash().into();
                assert_eq!(expected_calendar_id, calendar_id);
                assert_eq!(topic_type, TopicType::Data);
            }
            _ => panic!(),
        }
    }

    #[tokio::test]
    async fn publish() {
        let context = Service::run().await;
        let private_key = context.lock().await.node.private_key.clone();
        let rpc = Rpc { context };

        let (channel_tx, mut channel_rx) = broadcast::channel(10);
        let result = rpc.init(channel_tx).await;
        assert!(result.is_ok());

        let calendar_stream = StreamName {
            owner: private_key.public_key(),
            name: "my_unique_calendar".to_string(),
        };

        let result = rpc.select_calendar(calendar_stream.hash().into()).await;
        assert!(result.is_ok());
        let _event = channel_rx.recv().await.unwrap();

        let payload = json!({
            "message": "organize!"
        });

        let result = rpc
            .publish(
                serde_json::to_vec(&payload).unwrap(),
                TopicType::Data,
                Some(calendar_stream.hash().into()),
                Some(calendar_stream),
                Some(StreamType::Calendar),
            )
            .await;
        assert!(result.is_ok());
        let event = channel_rx.recv().await.unwrap();
        match event {
            ChannelEvent::Stream(stream_event) => {
                let EventMeta {
                    author,
                    calendar_id,
                    stream_type,
                    stream_name,
                    ..
                } = stream_event.meta;

                assert_eq!(author, private_key.public_key());
                assert_eq!(calendar_id, CalendarId::from(stream_name.hash()));
                assert_eq!(stream_name, stream_name);
                assert_eq!(stream_type, StreamType::Calendar);

                let EventData::Application(value) = stream_event.data else {
                    panic!();
                };

                assert_eq!(value, payload);
            }
            _ => panic!(),
        }
    }
}
