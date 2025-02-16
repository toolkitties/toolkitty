use std::collections::HashMap;

use futures_util::future::Shared;
use futures_util::FutureExt;
use p2panda_core::PrivateKey;
use p2panda_net::{FromNetwork, SystemEvent};
use p2panda_store::MemoryStore;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};
use tracing::debug;

use crate::messages::{ChannelEvent, NetworkEvent};
use crate::node::extensions::CalendarId;
use crate::node::{Node, StreamEvent};
use crate::topic::{NetworkTopic, TopicMap};

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
    pub channel_tx: mpsc::Sender<Channel<ChannelEvent>>,

    /// Flag indicating that we already received a channel from the frontend (init was already
    /// called). There is a bug if `init` is called twice.
    pub channel_set: bool,
}

impl Context {
    pub fn new(
        node: Node<NetworkTopic>,
        to_app_tx: broadcast::Sender<ChannelEvent>,
        topic_map: TopicMap,
        channel_tx: mpsc::Sender<Channel<ChannelEvent>>,
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
    app_handle: AppHandle,

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
    channel_rx: mpsc::Receiver<Channel<ChannelEvent>>,
}

impl Service {
    /// Construct node, context and channels required for running the app service. Already
    /// subscribe to the invite codes topic.
    ///
    /// The node and several channel senders are added to the shared app context while channel
    /// receivers are stored on the Service struct for use during the runtime loop.
    pub async fn build(app_handle: AppHandle) -> anyhow::Result<Self> {
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
        app_handle.manage(Mutex::new(context));

        Ok(Self {
            app_handle,
            stream_rx,
            invite_codes_rx,
            invite_codes_ready: shared_invite_codes_ready,
            network_events_rx,
            to_app_rx,
            channel_rx,
        })
    }

    /// Spawn the service task.
    pub fn run(app_handle: AppHandle) {
        tauri::async_runtime::spawn(async move {
            let mut app = Self::build(app_handle).await.expect("build stream");
            let channel = app.recv_channel().await.expect("receive on channel rx");
            app.spawn_invite_code_ready_watcher(channel.clone());
            app.inner_run(channel).await.expect("run stream task");
        });
    }

    /// Run the inner service loop which awaits events arriving on the app, network, stream and
    /// invite codes channels.
    async fn inner_run(mut self, channel: Channel<ChannelEvent>) -> anyhow::Result<()> {
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
                    let state = self.app_handle.state::<Mutex<Context>>();
                    let state = state.lock().await;

                    // Check if the event is associated with the currently selected calendar. We
                    // only forward it up to the application if it is.
                    //
                    // @TODO: This is filtering out the operations _after_ they've been processed
                    // by the backend. We should go through the whole processing pipeline when
                    // selected and not at all when not.
                    if let Some(ref selected_calendar) = state.selected_calendar {
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

    async fn recv_channel(&mut self) -> anyhow::Result<Channel<ChannelEvent>> {
        let Some(channel) = self.channel_rx.recv().await else {
            return Err(anyhow::anyhow!("channel tx closed"));
        };

        self.app_handle
            .state::<Mutex<Context>>()
            .lock()
            .await
            .channel_set = true;

        Ok(channel)
    }

    fn spawn_invite_code_ready_watcher(&self, channel: Channel<ChannelEvent>) {
        let rt = tokio::runtime::Handle::current();
        let channel = channel.clone();
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
