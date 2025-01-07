mod node;

use p2panda_core::{Hash, PrivateKey};
use tauri::ipc::Channel;
use tauri::{Builder, Manager, State};
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio::task::{self, JoinHandle};

use node::{EventData, Node, PublishError, StreamEvent};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum ToolkittyEvent {
    #[serde(rename_all = "camelCase")]
    Application { operation_id: Hash, data: String },
    #[serde(rename_all = "camelCase")]
    Error { operation_id: Hash, error: String },
}

// create the error type that represents all errors possible in our program
#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    PublishError(#[from] PublishError),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),

    #[error("oneshot channel receiver closed")]
    OneshotChannelError,

    #[error("stream channel already set")]
    SetStreamChannelError,
}

// we must manually implement serde::Serialize
impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

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
) -> Result<(), Error> {
    let mut state = state.lock().await;

    match state.channel_oneshot_tx.take() {
        Some(tx) => {
            if let Err(_) = tx.send(stream_channel) {
                return Err(Error::OneshotChannelError);
            }
        }
        None => return Err(Error::SetStreamChannelError),
    };

    Ok(())
}

#[tauri::command]
async fn publish(state: State<'_, Mutex<AppContext>>, payload: &str) -> Result<Hash, Error> {
    let mut state = state.lock().await;
    let operation_id = state.node.publish(&payload.as_bytes()).await?;
    Ok(operation_id)
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

                let _result = node_rx_task(node_rx, oneshot_rx).await;
            });

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![publish, start])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
