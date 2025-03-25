use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use p2panda_core::{Hash, PrivateKey, PublicKey};
use p2panda_net::{SystemEvent, TopicId};
use p2panda_node::extensions::LogId;
use p2panda_node::node::Node;
use p2panda_node::operation::create_operation;
use p2panda_node::stream::StreamEvent;
use p2panda_node::topic::{Topic, TopicMap};
use p2panda_store::MemoryStore;
use p2panda_sync::log_sync::TopicLogMap;
use serde::Serialize;
#[cfg(not(test))]
use tauri::{AppHandle, Manager};
use thiserror::Error;
use tokio::sync::{broadcast, mpsc, RwLock};
use tracing::debug;

use crate::extensions::{to_log_id, Extensions, LogPath, Stream, StreamOwner, StreamRootHash};
use crate::messages::{ChannelEvent, NetworkEvent, StreamArgs};

const NETWORK_ID: &str = "toolkitty";

/// Shared application context which can be accessed from within the main application runtime loop
/// as well as any tauri command.
pub struct Context {
    /// Local p2panda node.
    pub node: Node<Topic, LogId, Extensions>,

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
        node: Node<Topic, LogId, Extensions>,
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
    context: Arc<RwLock<Context>>,

    /// Stream where we receive all topic events from the p2panda node.
    stream_rx: mpsc::Receiver<StreamEvent<Extensions>>,

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
    pub async fn build(blobs_base_dir: PathBuf) -> anyhow::Result<Self> {
        let private_key = PrivateKey::new();
        let store = MemoryStore::<LogId, Extensions>::new();
        let topic_map = TopicMap::new();
        let (node, stream_rx, network_events_rx) = Node::new(
            NETWORK_ID.to_string(),
            private_key.clone(),
            None,
            None,
            store,
            blobs_base_dir,
            topic_map.clone(),
        )
        .await
        .unwrap();

        let (to_app_tx, to_app_rx) = broadcast::channel(32);
        let (channel_tx, channel_rx) = mpsc::channel(32);

        let context = Context::new(node, to_app_tx, topic_map, channel_tx);

        Ok(Self {
            context: Arc::new(RwLock::new(context)),
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
            let blobs_root_dir = if cfg!(dev) {
                tempfile::tempdir().expect("temp dir").into_path()
            } else {
                app_handle
                    .path()
                    .app_data_dir()
                    .expect("app data directory")
            };
            let mut app = Self::build(blobs_root_dir).await.expect("build stream");
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
    pub async fn run() -> Arc<RwLock<Context>> {
        let temp_blobs_root_dir = tempfile::tempdir().expect("temp dir");
        let mut app = Self::build(temp_blobs_root_dir.into_path())
            .await
            .expect("build stream");
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
        mut channel: broadcast::Sender<ChannelEvent>,
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
                    channel.send(ChannelEvent::Stream(event.into()))?;
                },
                Some(new_channel) = self.channel_rx.recv() => {
                    channel = new_channel;
                },
            }
        }
    }

    async fn recv_channel(&mut self) -> anyhow::Result<broadcast::Sender<ChannelEvent>> {
        let Some(channel) = self.channel_rx.recv().await else {
            return Err(anyhow::anyhow!("channel tx closed"));
        };

        self.context.write().await.channel_set = true;

        Ok(channel)
    }
}

pub struct Rpc {
    pub(crate) context: Arc<RwLock<Context>>,
}

impl Rpc {
    /// Initialize the app by passing it a channel from the frontend.
    pub async fn init(&self, channel: broadcast::Sender<ChannelEvent>) -> Result<(), RpcError> {
        let context = self.context.write().await;

        context
            .channel_tx
            .send(channel)
            .await
            .expect("send on channel");

        Ok(())
    }
    /// The public key of the local node.
    pub async fn public_key(&self) -> Result<PublicKey, RpcError> {
        let context = self.context.read().await;
        let public_key = context.node.private_key.public_key();
        Ok(public_key)
    }

    /// Acknowledge operations to mark them as successfully processed in the stream controller.
    pub async fn ack(&self, operation_id: Hash) -> Result<(), RpcError> {
        let mut context = self.context.write().await;
        context.node.ack(operation_id).await?;
        Ok(())
    }

    /// Replay any un-ack'd messages on a persisted topic.
    pub async fn replay(&self, topic: &str) -> Result<(), RpcError> {
        let mut context = self.context.write().await;
        let topic = Topic::Persisted(topic.to_string());
        if let Some(logs) = context.topic_map.get(&topic).await {
            context.node.replay(logs).await?;
        };
        Ok(())
    }

    /// Add a persisted topic to the topic log map.
    pub async fn add_topic_log(
        &self,
        public_key: &PublicKey,
        topic: &str,
        log_id: &LogId,
    ) -> Result<(), RpcError> {
        let context = self.context.write().await;
        let topic = Topic::Persisted(topic.to_string());
        context.topic_map.add_log(&topic, public_key, log_id).await;
        Ok(())
    }

    /// Subscribe to a persisted topic.
    pub async fn subscribe_persisted(&self, topic: &str) -> Result<(), RpcError> {
        let topic = Topic::Persisted(topic.to_string());
        return self.subscribe(&topic).await;
    }

    /// Subscribe to a ephemeral topic.
    pub async fn subscribe_ephemeral(&self, topic: &str) -> Result<(), RpcError> {
        let topic = Topic::Ephemeral(topic.to_string());
        return self.subscribe(&topic).await;
    }

    async fn subscribe(&self, topic: &Topic) -> Result<(), RpcError> {
        let mut context = self.context.write().await;

        if context
            .subscriptions
            .insert(topic.id(), topic.clone())
            .is_some()
        {
            return Ok(());
        };

        match topic {
            Topic::Ephemeral(_) => {
                context
                    .node
                    .subscribe_ephemeral(topic)
                    .await
                    .expect("can subscribe to topic");
            }
            Topic::Persisted(_) => {
                context
                    .node
                    .subscribe_persisted(topic)
                    .await
                    .expect("can subscribe to topic");
            }
        }

        context
            .to_app_tx
            .send(ChannelEvent::SubscribedToTopic(topic.clone()))?;

        Ok(())
    }

    /// Publish to a persisted topic.
    pub async fn publish_persisted(
        &self,
        payload: &[u8],
        stream_args: &StreamArgs,
        log_path: Option<&str>,
        topic: Option<&str>,
    ) -> Result<(Hash, Hash), RpcError> {
        let mut context = self.context.write().await;
        let private_key = context.node.private_key.clone();

        let stream_root_hash: Option<StreamRootHash> = stream_args.root_hash.map(Into::into);
        let stream_owner: Option<StreamOwner> = stream_args.owner.map(Into::into);

        let log_path = log_path.map(|log_path| LogPath(log_path.to_string()));
        let log_id = match (stream_root_hash, stream_owner) {
            (Some(root_hash), Some(owner)) => {
                let stream = Stream { root_hash, owner };
                Some(to_log_id(stream, log_path.clone()))
            }
            _ => None,
        };

        let extensions = Extensions {
            stream_root_hash: stream_args.root_hash.map(Into::into),
            stream_owner: stream_args.owner.map(Into::into),
            log_path,
            ..Default::default()
        };

        let (header, body) = create_operation(
            &mut context.node.store,
            &private_key,
            log_id.as_ref(),
            Some(extensions),
            Some(payload),
        )
        .await;

        match topic {
            Some(topic) => {
                let topic = Topic::Persisted(topic.to_string());
                context
                    .node
                    .publish_persisted(&topic, &header, body.as_ref())
                    .await?;
            }
            None => {
                context.node.ingest(&header, body.as_ref()).await?;
            }
        }

        debug!("publish operation: {}", header.hash());

        let stream: Stream = header.extension().expect("extract stream extension");

        Ok((header.hash(), stream.id()))
    }

    /// Publish to an ephemeral topic.
    pub async fn publish_ephemeral(&self, topic: &str, payload: &[u8]) -> Result<(), RpcError> {
        let mut context = self.context.write().await;
        let topic = Topic::Ephemeral(topic.to_string());
        context.node.publish_ephemeral(&topic, payload).await?;
        Ok(())
    }

    /// Upload a file.
    pub async fn upload_file(&self, path: PathBuf) -> Result<Hash, RpcError> {
        let context = self.context.read().await;
        let file_hash = context.node.upload_file(path).await?;
        Ok(file_hash)
    }
}

#[derive(Debug, Error)]
pub enum RpcError {
    #[error(transparent)]
    StreamController(#[from] p2panda_node::stream::StreamControllerError),

    #[error(transparent)]
    Publish(#[from] p2panda_node::node::PublishError),

    #[error(transparent)]
    Blob(#[from] p2panda_node::node::BlobError),

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
    use std::time::Duration;

    use p2panda_node::{extensions::LogId, topic::Topic};
    use serde_json::json;
    use tokio::sync::broadcast;

    use crate::{
        extensions::{LogPath, Stream, StreamOwner, StreamRootHash},
        messages::{
            ChannelEvent, StreamArgs, ToolkittyEventData, ToolkittyEventMeta, ToolkittyStreamEvent,
        },
    };

    use super::{Rpc, Service};

    #[tokio::test]
    async fn public_key() {
        let context = Service::run().await;
        let node_private_key = context.read().await.node.private_key.clone();
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

        let topic = Topic::Persisted("some_topic".into());
        let result = rpc.subscribe(&topic).await;
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
    async fn subscribe_ephemeral() {
        let context = Service::run().await;
        let rpc = Rpc { context };

        let (channel_tx, mut channel_rx) = broadcast::channel(10);
        let result = rpc.init(channel_tx).await;
        assert!(result.is_ok());

        let topic = Topic::Ephemeral("some_topic".to_string());
        let result = rpc.subscribe(&topic).await;
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
        let private_key = context.read().await.node.private_key.clone();
        let topic = "some_topic";

        let rpc = Rpc { context };

        let (channel_tx, mut channel_rx) = broadcast::channel(10);
        let result = rpc.init(channel_tx).await;
        assert!(result.is_ok());

        let log_path = "calendar/inbox";

        let payload = json!({
            "message": "organize!"
        });

        let stream_args = StreamArgs {
            id: None,
            root_hash: None,
            owner: None,
        };

        let result = rpc
            .publish_persisted(
                &serde_json::to_vec(&payload).unwrap(),
                &stream_args,
                Some(&log_path),
                Some(&topic),
            )
            .await;

        assert!(result.is_ok());
        let (operation_hash, stream_id) = result.unwrap();

        let expected_log_path = log_path;
        let event = channel_rx.recv().await.unwrap();
        match event {
            ChannelEvent::Stream(stream_event) => {
                let ToolkittyEventMeta {
                    operation_id,
                    author,
                    stream,
                    log_path,
                } = stream_event.meta.unwrap();

                assert_eq!(author, private_key.public_key());
                assert_eq!(operation_id, operation_hash);
                assert_eq!(stream.id, stream_id);
                assert_eq!(stream.root_hash, StreamRootHash::from(operation_hash));
                assert_eq!(stream.owner, StreamOwner::from(private_key.public_key()));
                assert_eq!(log_path, Some(LogPath::from(expected_log_path.to_string())));

                let ToolkittyEventData::Application(value) = stream_event.data else {
                    panic!();
                };

                assert_eq!(value, payload);
            }
            _ => panic!(),
        }
    }

    #[tokio::test]
    async fn two_peers_subscribe() {
        let peer_a = Rpc {
            context: Service::run().await,
        };
        let peer_b = Rpc {
            context: Service::run().await,
        };

        let (peer_a_tx, _peer_a_rx) = broadcast::channel(100);
        let (peer_b_tx, mut peer_b_rx) = broadcast::channel(100);

        let result = peer_a.init(peer_a_tx).await;
        assert!(result.is_ok());

        let result = peer_b.init(peer_b_tx).await;
        assert!(result.is_ok());

        let topic = "some_topic";
        let result = peer_a.subscribe_ephemeral(&topic).await;
        assert!(result.is_ok());

        let result = peer_b.subscribe_ephemeral(&topic).await;
        assert!(result.is_ok());

        let send_payload = json!({
            "message": "organize!"
        });

        {
            let send_payload = send_payload.clone();
            tokio::spawn(async move {
                loop {
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    let result = peer_a
                        .publish_ephemeral(&topic, &serde_json::to_vec(&send_payload).unwrap())
                        .await;
                    assert!(result.is_ok());
                }
            });
        }

        let mut message_received = false;
        while let Ok(event) = peer_b_rx.recv().await {
            if let ChannelEvent::Stream(ToolkittyStreamEvent {
                data: ToolkittyEventData::Ephemeral(payload),
                ..
            }) = event
            {
                assert_eq!(send_payload, payload);
                message_received = true;
                break;
            }
        }

        assert!(message_received);
    }

    #[tokio::test]
    async fn two_peers_sync() {
        let peer_a = Rpc {
            context: Service::run().await,
        };
        let peer_b = Rpc {
            context: Service::run().await,
        };

        let peer_a_public_key = peer_a.public_key().await.unwrap();
        let peer_b_public_key = peer_b.public_key().await.unwrap();

        let (peer_a_tx, mut peer_a_rx) = broadcast::channel(100);
        let (peer_b_tx, mut peer_b_rx) = broadcast::channel(100);

        let result = peer_a.init(peer_a_tx).await;
        assert!(result.is_ok());

        let result = peer_b.init(peer_b_tx).await;
        assert!(result.is_ok());

        let topic = "messages";
        let log_path = "messages";
        let stream_args = StreamArgs::default();

        let peer_a_payload = json!({
            "message": "organize!"
        });

        // Peer A publishes the first message to a new stream.
        let result = peer_a
            .publish_persisted(
                &serde_json::to_vec(&peer_a_payload).unwrap(),
                &stream_args,
                Some(&log_path),
                Some(&topic),
            )
            .await;
        assert!(result.is_ok());

        // We need these values so Peer B can subscribe and publish to the correct stream.
        let (operation_id, stream_id) = result.unwrap();

        let stream_args = StreamArgs {
            id: Some(stream_id),
            root_hash: Some(operation_id.clone()),
            owner: Some(peer_a_public_key.clone()),
        };

        let peer_b_payload = json!({
            "message": "Hell yeah!"
        });

        // Peer B publishes it's own message to the stream.
        let result = peer_b
            .publish_persisted(
                &serde_json::to_vec(&peer_b_payload).unwrap(),
                &stream_args,
                Some(&log_path),
                Some(&topic),
            )
            .await;
        assert!(result.is_ok());

        // Both peers add themselves and each other to their topic map.
        let stream = Stream {
            root_hash: operation_id.into(),
            owner: peer_a_public_key.into(),
        };
        let log_id = LogId(format!("{}/{}", stream.id(), log_path.to_string()));

        peer_a
            .add_topic_log(&peer_a_public_key, &topic, &log_id)
            .await
            .unwrap();
        peer_a
            .add_topic_log(&peer_b_public_key, &topic, &log_id)
            .await
            .unwrap();

        peer_b
            .add_topic_log(&peer_a_public_key, &topic, &log_id)
            .await
            .unwrap();
        peer_b
            .add_topic_log(&peer_b_public_key, &topic, &log_id)
            .await
            .unwrap();

        // Finally they both subscribe to the topic.
        let result = peer_a.subscribe_persisted(&topic).await;
        assert!(result.is_ok());
        let result = peer_b.subscribe_persisted(&topic).await;
        assert!(result.is_ok());

        // Peer A should receive Peer B's message via sync.
        let mut message_received = false;
        while let Ok(event) = peer_a_rx.recv().await {
            if let ChannelEvent::Stream(ToolkittyStreamEvent {
                data: ToolkittyEventData::Application(payload),
                meta: Some(ToolkittyEventMeta { author, .. }),
            }) = event
            {
                if author == peer_b_public_key {
                    assert_eq!(peer_b_payload, payload);
                    message_received = true;
                    break;
                }
            }
        }

        assert!(message_received);

        // Peer B should receive Peer A's message via sync.
        let mut message_received = false;
        while let Ok(event) = peer_b_rx.recv().await {
            if let ChannelEvent::Stream(ToolkittyStreamEvent {
                data: ToolkittyEventData::Application(payload),
                meta: Some(ToolkittyEventMeta { author, .. }),
            }) = event
            {
                if author == peer_a_public_key {
                    assert_eq!(peer_a_payload, payload);
                    message_received = true;
                    break;
                }
            }
        }

        assert!(message_received);
    }
}
