mod node;
mod topic;

use p2panda_core::{Hash, PrivateKey};
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
    channel_oneshot_tx: Option<oneshot::Sender<Channel<StreamEvent>>>,
}

#[tauri::command]
async fn init(
    state: State<'_, Mutex<AppContext>>,
    stream_channel: Channel<StreamEvent>,
) -> Result<(), InitError> {
    let mut state = state.lock().await;

    let (invite_codes_rx, _ready) = state
        .node
        .subscribe(NetworkTopic::InviteCodes)
        .await
        .unwrap();

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

                let (node, node_rx) = Node::<NetworkTopic>::new(private_key, topic_map)
                    .await
                    .expect("node successfully starts");
                let (channel_oneshot_tx, channel_oneshot_rx) = oneshot::channel();

                app_handle.manage(Mutex::new(AppContext {
                    node,
                    channel_oneshot_tx: Some(channel_oneshot_tx),
                }));

                if let Err(err) = node_rx_task(node_rx, channel_oneshot_rx).await {
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

/// Task for receiving events sent from the node and forwarding them up to the app layer.
async fn node_rx_task(
    mut node_rx: mpsc::Receiver<StreamEvent>,
    channel_oneshot_rx: oneshot::Receiver<Channel<StreamEvent>>,
) -> anyhow::Result<()> {
    let join_handle: JoinHandle<anyhow::Result<()>> = task::spawn(async move {
        let channel = channel_oneshot_rx.await?;
        while let Some(event) = node_rx.recv().await {
            channel.send(event)?;
        }

        Ok(())
    });

    let result = join_handle.await?;
    result
}

#[derive(Debug, Error)]
enum InitError {
    #[error(transparent)]
    TauriError(#[from] tauri::Error),

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
