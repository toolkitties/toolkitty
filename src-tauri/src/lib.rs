mod node;
mod topic;

use p2panda_core::{Hash, PrivateKey};
use p2panda_net::FromNetwork;
use p2panda_store::MemoryStore;
use serde::ser::SerializeStruct;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::{Builder, Manager, State};
use thiserror::Error;
use tokio::sync::{mpsc, oneshot, Mutex};

use crate::node::operation::{create_operation, CalendarId, Extensions, LogId};
use crate::node::{AckError, Node, PublishError, StreamEvent};
use crate::topic::{NetworkTopic, TopicMap};

struct AppContext {
    node: Node<NetworkTopic>,
    store: MemoryStore<LogId, Extensions>,
    private_key: PrivateKey,
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
async fn select_calendar(
    state: State<'_, Mutex<AppContext>>,
    calendar_id: Hash,
) -> Result<(), PublishError> {
    let state = state.lock().await;
    state
        .node
        .subscribe_processed(&NetworkTopic::Calendar { calendar_id })
        .await
        .unwrap();
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
    let topic = NetworkTopic::Calendar { calendar_id: hash };

    // This is a new calendar and so we have never subscribed to it's topic yet. Do this before
    // actually publishing the create event.
    state.node.subscribe_processed(&topic).await.unwrap();

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

                let (node, stream_rx) = Node::<NetworkTopic>::new(
                    private_key.clone(),
                    store.clone(),
                    topic_map.clone(),
                )
                .await
                .expect("node successfully starts");
                let (channel_oneshot_tx, channel_oneshot_rx) = oneshot::channel();

                let (invite_codes_rx, invite_codes_ready) =
                    node.subscribe(NetworkTopic::InviteCodes).await.unwrap();

                app_handle.manage(Mutex::new(AppContext {
                    node,
                    store,
                    private_key,
                    topic_map: topic_map.clone(),
                    channel_oneshot_tx: Some(channel_oneshot_tx),
                }));

                if let Err(err) = forward_to_app_layer(
                    stream_rx,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Task for receiving data from network and forwarding them up to the app layer.
async fn forward_to_app_layer(
    mut stream_rx: mpsc::Receiver<StreamEvent>,
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

                    // Send event further up to application layer.
                    channel.send(ChannelEvent::Stream(event)).unwrap();
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
