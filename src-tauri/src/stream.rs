use std::collections::HashMap;

use p2panda_core::PrivateKey;
use p2panda_net::{FromNetwork, SystemEvent};
use p2panda_store::MemoryStore;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};

use crate::messages::{ChannelEvent, NetworkEvent};
use crate::node::operation::CalendarId;
use crate::node::{Node, StreamEvent};
use crate::topic::{NetworkTopic, TopicMap};

pub struct AppContext {
    pub node: Node<NetworkTopic>,
    pub selected_calendar: Option<CalendarId>,
    pub subscriptions: HashMap<[u8; 32], NetworkTopic>,
    pub to_app_tx: broadcast::Sender<ChannelEvent>,
    #[allow(dead_code)]
    pub topic_map: TopicMap,
    pub channel_tx: mpsc::Sender<Channel<ChannelEvent>>,
    pub channel_set: bool,
}

impl AppContext {
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

pub struct Stream {
    app_handle: AppHandle,
    stream_rx: mpsc::Receiver<StreamEvent>,
    invite_codes_rx: mpsc::Receiver<FromNetwork>,
    invite_codes_ready: oneshot::Receiver<()>,
    network_events_rx: broadcast::Receiver<SystemEvent<NetworkTopic>>,
    topic_map: TopicMap,
    to_app_rx: broadcast::Receiver<ChannelEvent>,
    channel_rx: mpsc::Receiver<Channel<ChannelEvent>>,
}

impl Stream {
    pub async fn build(app_handle: AppHandle) -> anyhow::Result<Self> {
        let private_key = PrivateKey::new();
        let store = MemoryStore::new();
        let topic_map = TopicMap::new();

        let (node, stream_rx, network_events_rx) =
            Node::new(private_key.clone(), store.clone(), topic_map.clone()).await?;

        let (invite_codes_rx, invite_codes_ready) =
            node.subscribe(NetworkTopic::InviteCodes).await?;

        let (to_app_tx, to_app_rx) = broadcast::channel(32);
        let (channel_tx, channel_rx) = mpsc::channel(32);

        let context = AppContext::new(node, to_app_tx, topic_map.clone(), channel_tx);
        app_handle.manage(Mutex::new(context));

        Ok(Self {
            app_handle,
            stream_rx,
            invite_codes_rx,
            invite_codes_ready,
            network_events_rx,
            topic_map,
            to_app_rx,
            channel_rx,
        })
    }

    pub async fn run(mut self) -> anyhow::Result<()> {
        let rt = tokio::runtime::Handle::current();

        // @TODO: Handle errors in this method.
        let Some(channel) = self.channel_rx.recv().await else {
            return Err(anyhow::anyhow!("channel tx closed"));
        };

        self.app_handle
            .state::<Mutex<AppContext>>()
            .lock()
            .await
            .channel_set = true;

        {
            let channel = channel.clone();
            rt.spawn(async move {
                let _ = self.invite_codes_ready.await;
                channel
                    .send(ChannelEvent::InviteCodesReady)
                    .expect("channel receiver not dropped");
            });
        }

        loop {
            tokio::select! {
                Ok(event) = self.to_app_rx.recv() => {
                    channel.send(event)?;
                }
                Ok(event) = self.network_events_rx.recv() => {
                    channel.send(ChannelEvent::NetworkEvent(NetworkEvent(event)))?;
                },
                Some(event) = self.stream_rx.recv() => {
                    // Register author as contributor to this calendar in our database.
                    //
                    // @NOTE(adz): At this point we are in the middle of processing this event and
                    // haven't ack-ed it yet. The data itself might be invalid, but we already
                    // inserted it here into the topic map, which will allow other peers to sync it
                    // from us.
                    //
                    // There is probably a better place to do this, but it needs more thought. For
                    // now I'll leave it here as a POC.
                    let StreamEvent { meta, .. } = &event;
                    self.topic_map.add_author(meta.public_key, meta.calendar_id).await;

                    let state = self.app_handle.state::<Mutex<AppContext>>();
                    let state = state.lock().await;

                    // Check if the event is associated with the currently selected calendar. We
                    // only forward it up to the application if it is.
                    //
                    // @TODO: This is filtering out the operations _after_ they've been processed
                    // by the backend. We should go through the whole processing pipeline when
                    // selected and not at all when not.
                    if let Some(selected_calendar) = state.selected_calendar {
                        if selected_calendar != meta.calendar_id {
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
}

pub fn spawn_stream(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let stream = Stream::build(app_handle).await.expect("build stream");
        stream.run().await.expect("run stream task");
    });
}
