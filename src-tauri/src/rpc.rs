use p2panda_core::{Hash, PublicKey};
use tauri::{ipc::Channel, State};
use tokio::sync::broadcast;
use tracing::debug;

use crate::app::{Rpc, RpcError};
use crate::messages::ChannelEvent;
use crate::node::extensions::StreamName;
use crate::topic::Topic;

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

#[tauri::command]
pub async fn replay(rpc: State<'_, Rpc>, topic: Topic) -> Result<(), RpcError> {
    debug!(
        command.name = "replay",
        command.topic = topic.to_string(),
        "RPC request received"
    );

    rpc.replay(topic).await?;
    Ok(())
}

/// Add an author to a calendar.
///
/// This means that we will actively sync operations from this author for the specific calendar.
#[tauri::command]
pub async fn add_topic_log(
    rpc: State<'_, Rpc>,
    public_key: PublicKey,
    topic: Topic,
    stream_name: StreamName,
) -> Result<(), RpcError> {
    debug!(
        command.name = "add_topic_log",
        command.public_key = public_key.to_hex(),
        command.topic = topic.to_string(),
        "RPC request received"
    );

    rpc.add_topic_log(public_key, topic, stream_name).await?;
    Ok(())
}

/// Subscribe to a specific calendar by it's id.
#[tauri::command]
pub async fn subscribe(rpc: State<'_, Rpc>, topic: Topic) -> Result<(), RpcError> {
    debug!(
        command.name = "subscribe",
        command.topic = topic.to_string(),
        "RPC request received"
    );

    rpc.subscribe(topic).await?;
    Ok(())
}

/// Subscribe to a specific calendar by it's id.
#[tauri::command]
pub async fn subscribe_ephemeral(rpc: State<'_, Rpc>, topic: Topic) -> Result<(), RpcError> {
    debug!(
        command.name = "subscribe_ephemeral",
        command.topic = topic.to_string(),
        "RPC request received"
    );

    rpc.subscribe_ephemeral(topic).await?;
    Ok(())
}

/// Select a calendar we have already subscribed to.
///
/// Calling this method causes all events for calendars other than the selected one to be filtered
/// out of the channel stream. The frontend will only receive events of the selected calendar.
///
/// Any operations which arrived at the node since we last selected this calendar will be replayed.
// #[tauri::command]
// pub async fn select_calendar(rpc: State<'_, Rpc>, calendar_id: CalendarId) -> Result<(), RpcError> {
//     debug!(
//         command.name = "select_calendar",
//         command.calendar_id = calendar_id.to_string(),
//         "RPC request received"
//     );
//
//     rpc.select_calendar(calendar_id).await?;
//     Ok(())
// }

/// Publish an event to a calendar topic.
///
/// Returns the hash of the operation on which the payload was encoded.
#[tauri::command]
pub async fn publish(
    rpc: State<'_, Rpc>,
    payload: serde_json::Value,
    topic: Topic,
    stream_name: Option<StreamName>,
) -> Result<Hash, RpcError> {
    debug!(
        command.name = "publish",
        command.topic = topic.to_string(),
        "RPC request received"
    );
    let payload = serde_json::to_vec(&payload)?;
    let hash = rpc.publish(payload, topic, stream_name).await?;
    Ok(hash)
}

#[tauri::command]
pub async fn create(
    rpc: State<'_, Rpc>,
    payload: serde_json::Value,
    stream_name: Option<StreamName>,
) -> Result<Hash, RpcError> {
    debug!(command.name = "create", "RPC request received");
    let payload = serde_json::to_vec(&payload)?;
    let hash = rpc.create(payload, stream_name).await?;
    Ok(hash)
}

/// Publish an invite code to onto the invite overlay network.
#[tauri::command]
pub async fn publish_ephemeral(
    rpc: State<'_, Rpc>,
    topic: Topic,
    payload: serde_json::Value,
) -> Result<(), RpcError> {
    debug!(
        command.name = "publish_to_invite_code_overlay",
        "RPC request received"
    );

    let payload = serde_json::to_vec(&payload)?;
    rpc.publish_ephemeral(topic, payload).await?;
    Ok(())
}
