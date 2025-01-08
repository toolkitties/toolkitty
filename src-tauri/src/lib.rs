mod node;

use p2panda_core::{Hash, PrivateKey};
use tauri::ipc::Channel;
use tauri::{Builder, Manager, State};
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio::task::{self, JoinHandle};

use node::{AckError, EventData, Node, PublishError, StreamEvent};

/// Enum of all possible event types which will be sent on the application stream.
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum ToolkittyEvent {
    #[serde(rename_all = "camelCase")]
    Application { operation_id: Hash, data: String },
    #[serde(rename_all = "camelCase")]
    Error { operation_id: Hash, error: String },
}

/// Top level error type used in RPC interface methods.
#[derive(Debug, thiserror::Error)]
enum ToolkittyError {
    #[error(transparent)]
    PublishError(#[from] PublishError),

    #[error(transparent)]
    AckError(#[from] AckError),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),

    #[error("oneshot channel receiver closed")]
    OneshotChannelError,

    #[error("stream channel already set")]
    SetStreamChannelError,
}

impl serde::Serialize for ToolkittyError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

/// Task for receiving events sent from the node and forwarding them up to the app layer.
async fn node_rx_task(
    mut node_rx: mpsc::Receiver<StreamEvent>,
    channel_oneshot_rx: oneshot::Receiver<Channel<ToolkittyEvent>>,
) -> anyhow::Result<()> {
    let join_handle: JoinHandle<anyhow::Result<()>> = task::spawn(async move {
        let channel = channel_oneshot_rx.await?;
        while let Some(event) = node_rx.recv().await {
            let operation_id = event.meta.header.hash();
            let toolkitty_event = match event.data {
                EventData::Application(body) => ToolkittyEvent::Application {
                    operation_id,
                    data: String::from_utf8(body.to_bytes()).unwrap(),
                },
                EventData::Error(stream_error) => ToolkittyEvent::Error {
                    operation_id,
                    error: stream_error.to_string(),
                },
            };
            channel.send(toolkitty_event)?;
        }

        Ok(())
    });

    let result = join_handle.await?;
    result
}

struct AppContext {
    node: Node,
    private_key: PrivateKey,
    channel_oneshot_tx: Option<oneshot::Sender<Channel<ToolkittyEvent>>>,
}

#[tauri::command]
async fn start(
    state: State<'_, Mutex<AppContext>>,
    stream_channel: Channel<ToolkittyEvent>,
) -> Result<(), ToolkittyError> {
    let mut state = state.lock().await;

    match state.channel_oneshot_tx.take() {
        Some(tx) => {
            if let Err(_) = tx.send(stream_channel) {
                return Err(ToolkittyError::OneshotChannelError);
            }
        }
        None => return Err(ToolkittyError::SetStreamChannelError),
    };

    Ok(())
}

#[tauri::command]
async fn publish(
    state: State<'_, Mutex<AppContext>>,
    payload: &str,
) -> Result<Hash, ToolkittyError> {
    let mut state = state.lock().await;
    let operation_id = state.node.publish(&payload.as_bytes()).await?;
    Ok(operation_id)
}

#[tauri::command]
async fn acknowledge(
    state: State<'_, Mutex<AppContext>>,
    operation_id: Hash,
) -> Result<(), ToolkittyError> {
    let mut state = state.lock().await;
    state.node.ack(operation_id).await?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let private_key = PrivateKey::new();
                let (node, node_rx) = Node::new(private_key.clone());
                let (oneshot_tx, oneshot_rx) = oneshot::channel();

                app_handle.manage(Mutex::new(AppContext {
                    node,
                    private_key,
                    channel_oneshot_tx: Some(oneshot_tx),
                }));

                if let Err(err) = node_rx_task(node_rx, oneshot_rx).await {
                    panic!("Failed to start node receiver task: {err}")
                };
            });

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![acknowledge, publish, start])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
