use p2panda_core::{Hash, PublicKey};
use tauri::AppHandle;
use tauri::{ipc::Channel, State};
use tauri_plugin_dialog::DialogExt;
use tokio::sync::broadcast;
use tracing::debug;

use crate::app::{Rpc, RpcError};
use crate::messages::{ChannelEvent, StreamArgs};
use crate::node::extensions::LogId;

/// Initialize the app by passing it a channel from the frontend.
#[tauri::command]
pub async fn init(rpc: State<'_, Rpc>, channel: Channel<ChannelEvent>) -> Result<(), RpcError> {
    debug!(command.name = "init", "RPC request received");

    let (channel_tx, mut channel_rx) = broadcast::channel(128);

    tokio::spawn(async move {
        while let Ok(event) = channel_rx.recv().await {
            channel.send(event).expect("send on channel");
        }
    });

    rpc.init(channel_tx).await?;
    Ok(())
}

/// The public key of the local node.
#[tauri::command]
pub async fn public_key(rpc: State<'_, Rpc>) -> Result<PublicKey, RpcError> {
    debug!(command.name = "public_key", "RPC request received");
    let public_key = rpc.public_key().await?;
    Ok(public_key)
}

/// Acknowledge operations to mark them as successfully processed in the stream controller.
#[tauri::command]
pub async fn ack(rpc: State<'_, Rpc>, operation_id: Hash) -> Result<(), RpcError> {
    debug!(
        command.name = "ack",
        command.operation_id = operation_id.to_hex(),
        "RPC request received"
    );

    rpc.ack(operation_id).await?;
    Ok(())
}

/// Replay un-ack'd messages on a persisted topic.
#[tauri::command]
pub async fn replay(rpc: State<'_, Rpc>, topic: String) -> Result<(), RpcError> {
    debug!(
        command.name = "replay",
        command.topic = topic,
        "RPC request received"
    );

    rpc.replay(&topic).await?;
    Ok(())
}

/// Add a log to the topic log map.
#[tauri::command]
pub async fn add_topic_log(
    rpc: State<'_, Rpc>,
    public_key: PublicKey,
    topic: &str,
    log_id: LogId,
) -> Result<(), RpcError> {
    debug!(
        command.name = "add_topic_log",
        command.public_key = public_key.to_hex(),
        command.topic = topic,
        "RPC request received"
    );

    rpc.add_topic_log(&public_key, topic, &log_id).await?;
    Ok(())
}

/// Subscribe to a persisted topic.
#[tauri::command]
pub async fn subscribe_persisted(rpc: State<'_, Rpc>, topic: String) -> Result<(), RpcError> {
    debug!(
        command.name = "subscribe_persisted",
        command.topic = topic,
        "RPC request received"
    );

    rpc.subscribe_persisted(&topic).await?;
    Ok(())
}

/// Subscribe to an ephemeral topic.
#[tauri::command]
pub async fn subscribe_ephemeral(rpc: State<'_, Rpc>, topic: String) -> Result<(), RpcError> {
    debug!(
        command.name = "subscribe_ephemeral",
        command.topic = topic,
        "RPC request received"
    );

    rpc.subscribe_ephemeral(&topic).await?;
    Ok(())
}

/// Publish to a persisted topic.
#[tauri::command]
pub async fn publish_persisted(
    rpc: State<'_, Rpc>,
    payload: serde_json::Value,
    stream_args: StreamArgs,
    log_path: Option<serde_json::Value>,
    topic: Option<String>,
) -> Result<(Hash, Hash), RpcError> {
    debug!(
        command.name = "publish_persisted",
        command.topic = topic.as_ref().map(ToString::to_string),
        "RPC request received"
    );
    let payload = serde_json::to_vec(&payload)?;
    let result = rpc
        .publish_persisted(
            &payload,
            &stream_args,
            log_path.map(Into::into).as_ref(),
            topic.as_deref(),
        )
        .await?;
    Ok(result)
}

/// Publish to an ephemeral topic.
#[tauri::command]
pub async fn publish_ephemeral(
    rpc: State<'_, Rpc>,
    topic: String,
    payload: serde_json::Value,
) -> Result<(), RpcError> {
    debug!(command.name = "publish_ephemeral", "RPC request received");
    let payload = serde_json::to_vec(&payload)?;
    rpc.publish_ephemeral(&topic, &payload).await?;
    Ok(())
}

/// Upload a file.
#[tauri::command]
pub async fn upload_file(rpc: State<'_, Rpc>, app: AppHandle) -> Result<Option<Hash>, RpcError> {
    debug!(command.name = "upload_file", "RPC request received");
    match app.dialog().file().blocking_pick_file() {
        Some(file_path) => {
            let file_path = file_path.into_path().expect("parseable file path");
            let file_hash = rpc.upload_file(file_path).await?;
            Ok(Some(file_hash))
        }
        None => Ok(None),
    }
}
