mod node;
mod topic;

use p2panda_core::{Hash, PrivateKey};
use p2panda_net::FromNetwork;
use serde::ser::SerializeStruct;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::{Builder, Manager, State};
use thiserror::Error;
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio::task::{self, JoinHandle};

use crate::node::{AckError, Node, PublishError, StreamEvent};
use crate::topic::{NetworkTopic, TopicMap};

struct AppContext {
    node: Node<NetworkTopic>,
    channel_oneshot_tx: Option<oneshot::Sender<Channel<ChannelEvent>>>,
}

#[tauri::command]
async fn init(
    state: State<'_, Mutex<AppContext>>,
    stream_channel: Channel<ChannelEvent>,
) -> Result<(), InitError> {
    let mut state = state.lock().await;

    match state.channel_oneshot_tx.take() {
        Some(tx) => {
            if let Err(_) = tx.send(stream_channel) {
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
async fn publish(
    state: State<'_, Mutex<AppContext>>,
    payload: serde_json::Value,
    calendar_id: Hash,
) -> Result<Hash, PublishError> {
    let mut state = state.lock().await;
    let payload = serde_json::to_vec(&payload).unwrap();
    let operation_id = state
        .node
        .publish_to_stream(&NetworkTopic::Calendar { calendar_id }, &payload)
        .await?;
    Ok(operation_id)
}

#[tauri::command]
async fn respond_to_invite_code(
    state: State<'_, Mutex<AppContext>>,
    payload: serde_json::Value,
) -> Result<(), PublishError> {
    let mut state = state.lock().await;
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

            tauri::async_runtime::spawn(async move {
                let private_key = PrivateKey::new();
                let topic_map = TopicMap::new();

                let (node, stream_rx) = Node::<NetworkTopic>::new(private_key, topic_map)
                    .await
                    .expect("node successfully starts");
                let (channel_oneshot_tx, channel_oneshot_rx) = oneshot::channel();

                let (invite_codes_rx, invite_codes_ready) =
                    node.subscribe(NetworkTopic::InviteCodes).await.unwrap();

                app_handle.manage(Mutex::new(AppContext {
                    node,
                    channel_oneshot_tx: Some(channel_oneshot_tx),
                }));

                if let Err(err) = forward_to_app_layer(
                    stream_rx,
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
            publish,
            respond_to_invite_code,
            select_calendar,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Task for receiving data from network and forwarding them up to the app layer.
async fn forward_to_app_layer(
    mut stream_rx: mpsc::Receiver<StreamEvent>,
    mut invite_codes_rx: mpsc::Receiver<FromNetwork>,
    invite_codes_ready: oneshot::Receiver<()>,
    channel_oneshot_rx: oneshot::Receiver<Channel<ChannelEvent>>,
) -> anyhow::Result<()> {
    // @TODO: Handle errors in this method.
    let channel = channel_oneshot_rx.await?;

    {
        let channel = channel.clone();
        task::spawn(async move {
            let _ = invite_codes_ready.await;
            channel.send(ChannelEvent::InviteCodesReady).unwrap();
        });
    }

    task::spawn(async move {
        loop {
            tokio::select! {
                Some(event) = stream_rx.recv() => {
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
