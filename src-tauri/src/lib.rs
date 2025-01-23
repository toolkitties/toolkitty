mod node;
mod topic;

use std::collections::HashMap;

use p2panda_core::{Hash, PrivateKey};
use p2panda_net::{FromNetwork, SystemEvent, TopicId};
use p2panda_store::MemoryStore;
use serde::ser::SerializeStruct;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::{AppHandle, Builder, Manager, State};
use thiserror::Error;
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};

use crate::node::operation::{create_operation, CalendarId, Extensions, LogId};
use crate::node::{AckError, Node, PublishError, StreamEvent};
use crate::topic::{NetworkTopic, TopicMap};

struct AppContext {
    node: Node<NetworkTopic>,
    store: MemoryStore<LogId, Extensions>,
    private_key: PrivateKey,
    selected_calendar: Option<CalendarId>,
    subscriptions: HashMap<[u8; 32], NetworkTopic>,
    to_app_tx: broadcast::Sender<ChannelEvent>,
    #[allow(dead_code)]
    topic_map: TopicMap,
    channel_oneshot_tx: Option<oneshot::Sender<Channel<ChannelEvent>>>,
}

#[tauri::command]
async fn init(
    state: State<'_, Mutex<AppContext>>,
    channel: Channel<ChannelEvent>,
) -> Result<(), InitError> {
    let mut state = state.lock().await;

    match state.channel_oneshot_tx.take() {
        Some(tx) => {
            if tx.send(channel).is_err() {
                return Err(InitError::OneshotChannelError);
            }
        }
        None => return Err(InitError::SetStreamChannelError),
    };

    Ok(())
}

#[tauri::command]
async fn ack(state: State<'_, Mutex<AppContext>>, operation_id: Hash) -> Result<(), AckError> {
    let mut state = state.lock().await;
    state.node.ack(operation_id).await?;
    Ok(())
}

#[tauri::command]
async fn subscribe_to_calendar(
    state: State<'_, Mutex<AppContext>>,
    calendar_id: CalendarId,
) -> Result<(), PublishError> {
    let mut state = state.lock().await;
    let topic = NetworkTopic::Calendar { calendar_id };

    if state.subscriptions.insert(topic.id(), topic).is_none() {
        // @TODO: error handling.
        state
            .node
            .subscribe_processed(&NetworkTopic::Calendar { calendar_id })
            .await
            .unwrap();
        state
            .to_app_tx
            .send(ChannelEvent::SubscribedToCalendar(calendar_id))
            .expect("can send on app tx");
    }
    Ok(())
}

#[tauri::command]
async fn select_calendar(
    state: State<'_, Mutex<AppContext>>,
    calendar_id: CalendarId,
) -> Result<(), PublishError> {
    let mut state = state.lock().await;
    state.selected_calendar = Some(calendar_id);
    state
        .to_app_tx
        .send(ChannelEvent::CalendarSelected(calendar_id))
        .expect("can send on app tx");
    Ok(())
}

#[tauri::command]
async fn create_calendar(
    state: State<'_, Mutex<AppContext>>,
    payload: serde_json::Value,
) -> Result<Hash, PublishError> {
    let mut state = state.lock().await;
    let private_key = state.private_key.clone();

    // @TODO: Handle error.
    let payload = serde_json::to_vec(&payload).unwrap();

    let extensions = Extensions::default();

    // @TODO(adz): Memory stores are infallible right now but we'll switch to a SQLite-based
    // one soon and then we need to handle this error here:
    let (header, body) =
        create_operation(&mut state.store, &private_key, extensions, Some(&payload)).await;

    let hash = header.hash();
    let calendar_id = hash.into();
    let topic = NetworkTopic::Calendar { calendar_id };

    // @TODO: It would be clearer if this "selecting" of the calendar was handled by calling the
    // IPC method from the front end. This is not possible until we have re-play of un-acked
    // operations though, as currently there is the chance that operations are missed (and not
    // re-played) if we don't select here.
    state.selected_calendar = Some(calendar_id);
    state
        .to_app_tx
        .send(ChannelEvent::CalendarSelected(calendar_id))
        .expect("can send on app tx");

    // This is a new calendar and so we have never subscribed to it's topic yet. Do this before
    // actually publishing the create event.
    if state
        .subscriptions
        .insert(topic.id(), topic.clone())
        .is_none()
    {
        state
            .node
            .subscribe_processed(&NetworkTopic::Calendar { calendar_id })
            .await
            .unwrap();
        state
            .to_app_tx
            .send(ChannelEvent::SubscribedToCalendar(calendar_id))
            .expect("can send on app tx");
    };

    state
        .node
        .publish_to_stream(&topic, &header, body.as_ref())
        .await?;

    Ok(hash)
}

#[tauri::command]
async fn publish_calendar_event(
    state: State<'_, Mutex<AppContext>>,
    payload: serde_json::Value,
    calendar_id: CalendarId,
) -> Result<Hash, PublishError> {
    let mut state = state.lock().await;
    let private_key = state.private_key.clone();

    // @TODO: Handle error.
    let payload = serde_json::to_vec(&payload).unwrap();

    let extensions = Extensions {
        calendar_id: Some(calendar_id),
        ..Default::default()
    };

    let (header, body) =
        create_operation(&mut state.store, &private_key, extensions, Some(&payload)).await;

    let topic = NetworkTopic::Calendar {
        calendar_id: calendar_id.into(),
    };

    state
        .node
        .publish_to_stream(&topic, &header, body.as_ref())
        .await?;

    Ok(header.hash())
}

#[tauri::command]
async fn publish_to_invite_code_overlay(
    state: State<'_, Mutex<AppContext>>,
    payload: serde_json::Value,
) -> Result<(), PublishError> {
    let mut state = state.lock().await;
    // @TODO: Handle error.
    let payload = serde_json::to_vec(&payload).unwrap();
    state
        .node
        .publish_ephemeral(&NetworkTopic::InviteCodes, &payload)
        .await?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();

            // @TODO(adz): All of this could be refactored to an own struct.
            tauri::async_runtime::spawn(async move {
                let private_key = PrivateKey::new();
                let store = MemoryStore::new();
                let topic_map = TopicMap::new();

                let (node, stream_rx, system_events_rx) = Node::<NetworkTopic>::new(
                    private_key.clone(),
                    store.clone(),
                    topic_map.clone(),
                )
                .await
                .expect("node successfully starts");
                let (channel_oneshot_tx, channel_oneshot_rx) = oneshot::channel();

                let (to_app_tx, to_app_rx) = broadcast::channel(32);

                let (invite_codes_rx, invite_codes_ready) = node
                    .subscribe(NetworkTopic::InviteCodes)
                    .await
                    .expect("subscribes to invite codes topic");

                app_handle.manage(Mutex::new(AppContext {
                    node,
                    store,
                    private_key,
                    selected_calendar: None,
                    subscriptions: HashMap::new(),
                    to_app_tx,
                    topic_map: topic_map.clone(),
                    channel_oneshot_tx: Some(channel_oneshot_tx),
                }));

                if let Err(err) = forward_to_app_layer(
                    app_handle,
                    stream_rx,
                    system_events_rx,
                    to_app_rx,
                    topic_map,
                    invite_codes_rx,
                    invite_codes_ready,
                    channel_oneshot_rx,
                )
                .await
                {
                    panic!("failed to start node receiver task: {err}")
                };
            });

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            init,
            ack,
            create_calendar,
            publish_calendar_event,
            publish_to_invite_code_overlay,
            select_calendar,
            subscribe_to_calendar,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Task for receiving data from network and forwarding them up to the app layer.
async fn forward_to_app_layer(
    app: AppHandle,
    mut stream_rx: mpsc::Receiver<StreamEvent>,
    mut system_events_rx: broadcast::Receiver<SystemEvent<NetworkTopic>>,
    mut to_app_rx: broadcast::Receiver<ChannelEvent>,
    topic_map: TopicMap,
    mut invite_codes_rx: mpsc::Receiver<FromNetwork>,
    invite_codes_ready: oneshot::Receiver<()>,
    channel_oneshot_rx: oneshot::Receiver<Channel<ChannelEvent>>,
) -> anyhow::Result<()> {
    let rt = tokio::runtime::Handle::current();

    // @TODO: Handle errors in this method.
    let channel = channel_oneshot_rx.await?;

    {
        let channel = channel.clone();
        rt.spawn(async move {
            let _ = invite_codes_ready.await;
            channel.send(ChannelEvent::InviteCodesReady).unwrap();
        });
    }

    rt.spawn(async move {
        loop {
            tokio::select! {
                Ok(event) = to_app_rx.recv() => {
                    channel.send(event).expect("can send on app channel");
                }
                Ok(event) = system_events_rx.recv() => {
                    if let SystemEvent::GossipJoined { topic_id, .. } = event {
                        let state = app.state::<Mutex<AppContext>>();
                        let state = state.lock().await;
    
                        if let Some(NetworkTopic::Calendar{calendar_id}) = state.subscriptions.get(&topic_id) {
                            channel.send(ChannelEvent::CalendarGossipJoined(*calendar_id)).expect("can send on app channel");
                        }
                    };
                },
                Some(event) = stream_rx.recv() => {
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
                    topic_map.add_author(meta.public_key, meta.calendar_id).await;

                    let state = app.state::<Mutex<AppContext>>();
                    let state = state.lock().await;

                    // Check if the event is associated with the currently selected calendar. We
                    // only forward it up to the application if it is.
                    if let Some(selected_calendar) = state.selected_calendar {
                        if selected_calendar != meta.calendar_id {
                            return;
                        };
                        channel.send(ChannelEvent::Stream(event)).unwrap();
                    }
                },
                Some(event) = invite_codes_rx.recv() => {
                    let json = match event {
                        FromNetwork::GossipMessage { bytes, .. } => {
                            serde_json::from_slice(&bytes).unwrap()
                        },
                        FromNetwork::SyncMessage { .. } => unreachable!(),
                    };
                    channel.send(ChannelEvent::InviteCodes(json)).unwrap();
                }
            }
        }
    });

    Ok(())
}

#[derive(Clone, Debug)]
enum ChannelEvent {
    Stream(StreamEvent),
    InviteCodesReady,
    InviteCodes(serde_json::Value),
    CalendarSelected(CalendarId),
    SubscribedToCalendar(CalendarId),
    CalendarGossipJoined(CalendarId),
}

impl Serialize for ChannelEvent {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            ChannelEvent::Stream(stream_event) => stream_event.serialize(serializer),
            ChannelEvent::InviteCodesReady => {
                let mut state = serializer.serialize_struct("StreamEvent", 1)?;
                state.serialize_field("event", "invite_codes_ready")?;
                state.end()
            }
            ChannelEvent::InviteCodes(payload) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "invite_codes")?;
                state.serialize_field("data", &payload)?;
                state.end()
            }
            ChannelEvent::CalendarSelected(calendar_id) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "calendar_selected")?;
                state.serialize_field("calendarId", &calendar_id)?;
                state.end()
            }
            ChannelEvent::SubscribedToCalendar(calendar_id) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "subscribed_to_calendar")?;
                state.serialize_field("calendarId", &calendar_id)?;
                state.end()
            }
            ChannelEvent::CalendarGossipJoined(calendar_id) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "calendar_gossip_joined")?;
                state.serialize_field("calendarId", &calendar_id)?;
                state.end()
            }
        }
    }
}

#[derive(Debug, Error)]
enum InitError {
    #[error("oneshot channel receiver closed")]
    OneshotChannelError,

    #[error("stream channel already set")]
    SetStreamChannelError,
}

impl Serialize for InitError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
