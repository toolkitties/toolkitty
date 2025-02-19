use std::collections::HashMap;
use std::sync::Arc;

use p2panda_core::{Hash, PrivateKey, PublicKey};
use p2panda_net::{SystemEvent, TopicId};
use p2panda_store::MemoryStore;
use p2panda_sync::log_sync::TopicLogMap;
use serde::Serialize;
#[cfg(not(test))]
use tauri::{AppHandle, Manager};
use thiserror::Error;
use tokio::sync::{broadcast, mpsc, Mutex};
use tracing::debug;

use crate::messages::{ChannelEvent, NetworkEvent};
use crate::node::extensions::{Extensions, LogId, StreamName};
use crate::node::operation::create_operation;
use crate::node::{Node, StreamEvent};
use crate::topic::{Topic, TopicMap};

/// Shared application context which can be accessed from within the main application runtime loop
/// as well as any tauri command.
pub struct Context {
    /// Local p2panda node.
    pub node: Node<Topic>,

    /// All topics we have subscribed to.
    pub subscriptions: HashMap<[u8; 32], Topic>,

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
        node: Node<Topic>,
        to_app_tx: broadcast::Sender<ChannelEvent>,
        topic_map: TopicMap,
        channel_tx: mpsc::Sender<broadcast::Sender<ChannelEvent>>,
    ) -> Self {
        Self {
            node,
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

    /// Channel where we receive network status events from the p2panda node.
    network_events_rx: broadcast::Receiver<SystemEvent<Topic>>,

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

        let (to_app_tx, to_app_rx) = broadcast::channel(32);
        let (channel_tx, channel_rx) = mpsc::channel(32);

        let context = Context::new(node, to_app_tx, topic_map, channel_tx);

        Ok(Self {
            context: Arc::new(Mutex::new(context)),
            stream_rx,
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
                    channel.send(ChannelEvent::Stream(event))?;
                },
                // @TODO(sam): Need a way to handle ephemeral topics in the stream controller as
                // we now don't have a static topic we can subscribe to on startup.
                //
                // Some(event) = self.invite_codes_rx.recv() => {
                //     let json = match event {
                //         FromNetwork::GossipMessage { bytes, .. } => {
                //             serde_json::from_slice(&bytes)?
                //         },
                //         FromNetwork::SyncMessage { .. } => unreachable!(),
                //     };
                //     channel.send(ChannelEvent::InviteCodes(json))?;
                // }
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

    /// Acknowledge operations to mark them as successfully processed in the stream controller.
    pub async fn replay(&self, topic: Topic) -> Result<(), RpcError> {
        let mut context = self.context.lock().await;
        if let Some(logs) = context.topic_map.get(&topic).await {
            context.node.replay(logs).await?;
        };
        Ok(())
    }

    /// Add an author to a calendar.
    ///
    /// This means that we will actively sync operations from this author for the specific calendar.
    pub async fn add_topic_log(
        &self,
        public_key: PublicKey,
        topic: Topic,
        stream_name: StreamName,
    ) -> Result<(), RpcError> {
        let context = self.context.lock().await;
        let log_id = LogId { stream_name };

        context.topic_map.add_log(topic, public_key, log_id).await;
        Ok(())
    }

    /// Subscribe to a specific calendar by it's id.
    pub async fn subscribe(&self, topic: Topic) -> Result<(), RpcError> {
        let mut context = self.context.lock().await;

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
                .send(ChannelEvent::SubscribedToTopic(topic))?;
        }

        Ok(())
    }

    pub async fn subscribe_ephemeral(&self, topic: Topic) -> Result<(), RpcError> {
        let mut context = self.context.lock().await;

        if context
            .subscriptions
            .insert(topic.id(), topic.clone())
            .is_none()
        {
            context
                .node
                .subscribe_ephemeral(&topic)
                .await
                .expect("can subscribe to topic");

            context
                .to_app_tx
                .send(ChannelEvent::SubscribedToTopic(topic))?;
        }

        Ok(())
    }

    //
    //     /// Select a calendar we have already subscribed to.
    //     ///
    //     /// Calling this method causes all events for calendars other than the selected one to be filtered
    //     /// out of the channel stream. The frontend will only receive events of the selected calendar.
    //     ///
    //     /// Any operations which arrived at the node since we last selected this calendar will be replayed.
    //     pub async fn select_calendar(&self, calendar_id: CalendarId) -> Result<(), RpcError> {
    //         let mut context = self.context.lock().await;
    //         context.selected_calendar = Some(calendar_id);
    //
    //         context
    //             .to_app_tx
    //             .send(ChannelEvent::CalendarSelected(calendar_id))?;
    //
    //         // Ask stream controller to re-play all operations from logs inside this topic which haven't
    //         // been acknowledged yet by the frontend.
    //         if let Some(logs) = context
    //             .topic_map
    //             .get(&NetworkTopic::CalendarInbox { calendar_id })
    //             .await
    //         {
    //             context.node.replay(logs).await?;
    //         }
    //
    //         if let Some(logs) = context
    //             .topic_map
    //             .get(&NetworkTopic::CalendarData { calendar_id })
    //             .await
    //         {
    //             context.node.replay(logs).await?;
    //         }
    //
    //         Ok(())
    //     }

    /// Publish an event to a calendar topic.
    ///
    /// Returns the hash of the operation on which the payload was encoded.
    pub async fn publish(
        &self,
        payload: Vec<u8>,
        topic: Topic,
        stream_name: Option<StreamName>,
    ) -> Result<Hash, RpcError> {
        let mut context = self.context.lock().await;
        let private_key = context.node.private_key.clone();

        let extensions = Extensions {
            stream_name,
            ..Default::default()
        };

        let (header, body) = create_operation(
            &mut context.node.store,
            &private_key,
            extensions,
            Some(&payload),
        )
        .await;

        context
            .node
            .publish_to_stream(&topic, &header, body.as_ref())
            .await?;

        debug!("publish operation: {}", header.hash());

        Ok(header.hash())
    }

    /// Publish an event to a calendar topic.
    ///
    /// Returns the hash of the operation on which the payload was encoded.
    pub async fn create(
        &self,
        payload: Vec<u8>,
        stream_name: Option<StreamName>,
    ) -> Result<Hash, RpcError> {
        let mut context = self.context.lock().await;
        let private_key = context.node.private_key.clone();

        let extensions = Extensions {
            stream_name,
            ..Default::default()
        };

        let (header, body) = create_operation(
            &mut context.node.store,
            &private_key,
            extensions,
            Some(&payload),
        )
        .await;

        context.node.ingest(&header, body.as_ref()).await?;

        debug!("ingest operation: {}", header.hash());

        Ok(header.hash())
    }

    /// Publish an invite code to onto the invite overlay network.
    pub async fn publish_ephemeral(&self, topic: Topic, payload: Vec<u8>) -> Result<(), RpcError> {
        let mut context = self.context.lock().await;
        context.node.publish_ephemeral(&topic, &payload).await?;
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
    use p2panda_core::PrivateKey;
    use serde_json::json;
    use tokio::sync::broadcast;

    use crate::{
        messages::ChannelEvent,
        node::{
            extensions::StreamName,
            stream::{EventData, EventMeta},
        },
        topic::Topic,
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

        let stream_name: StreamName = json!({
            "owner": private_key.public_key().to_hex(),
            "uuid": "my_unique_calendar"
        })
        .into();

        let topic: Topic = stream_name.hash().to_hex().into();
        let result = rpc.subscribe(topic.clone()).await;
        assert!(result.is_ok());

        let event = channel_rx.recv().await.unwrap();
        match event {
            ChannelEvent::SubscribedToTopic(received_topic) => {
                assert_eq!(received_topic, topic);
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

        let stream_name: StreamName = json!({
            "owner": private_key.public_key().to_hex(),
            "uuid": "my_unique_calendar"
        })
        .into();

        let payload = json!({
            "message": "organize!"
        });

        let topic: Topic = stream_name.hash().to_hex().into();
        let result = rpc
            .publish(
                serde_json::to_vec(&payload).unwrap(),
                topic,
                Some(stream_name),
            )
            .await;
        assert!(result.is_ok());
        let event = channel_rx.recv().await.unwrap();
        match event {
            ChannelEvent::Stream(stream_event) => {
                let EventMeta {
                    author,
                    stream_name,
                    operation_id,
                } = stream_event.meta;

                assert_eq!(author, private_key.public_key());
                assert_eq!(stream_name, stream_name);

                let EventData::Application(value) = stream_event.data else {
                    panic!();
                };

                assert_eq!(value, payload);
            }
            _ => panic!(),
        }
    }
}
