use p2panda_core::{Hash, PublicKey};
use tauri::{ipc::Channel, State};
use tokio::sync::broadcast;
use tracing::debug;

use crate::app::{Rpc, RpcError};
use crate::messages::ChannelEvent;
use crate::node::extensions::{CalendarId, StreamName, StreamType};
use crate::topic::TopicType;

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

/// Add an author to a calendar.
///
/// This means that we will actively sync operations from this author for the specific calendar.
#[tauri::command]
pub async fn add_topic_log(
    rpc: State<'_, Rpc>,
    public_key: PublicKey,
    calendar_id: CalendarId,
    topic_type: TopicType,
    stream_name: StreamName,
) -> Result<(), RpcError> {
    debug!(
        command.name = "add_topic_log",
        command.public_key = public_key.to_hex(),
        command.topic_type = topic_type.to_string(),
        "RPC request received"
    );

    rpc.add_topic_log(public_key, calendar_id, topic_type, stream_name)
        .await?;
    Ok(())
}

/// Subscribe to a specific calendar by it's id.
#[tauri::command]
pub async fn subscribe(
    rpc: State<'_, Rpc>,
    calendar_id: CalendarId,
    topic_type: TopicType,
) -> Result<(), RpcError> {
    debug!(
        command.name = "subscribe",
        command.calendar_id = calendar_id.to_string(),
        command.topic_type = topic_type.to_string(),
        "RPC request received"
    );

    rpc.subscribe(calendar_id, topic_type).await?;
    Ok(())
}

/// Select a calendar we have already subscribed to.
///
/// Calling this method causes all events for calendars other than the selected one to be filtered
/// out of the channel stream. The frontend will only receive events of the selected calendar.
///
/// Any operations which arrived at the node since we last selected this calendar will be replayed.
#[tauri::command]
pub async fn select_calendar(rpc: State<'_, Rpc>, calendar_id: CalendarId) -> Result<(), RpcError> {
    debug!(
        command.name = "select_calendar",
        command.calendar_id = calendar_id.to_string(),
        "RPC request received"
    );

    rpc.select_calendar(calendar_id).await?;
    Ok(())
}

/// Publish an event to a calendar topic.
///
/// Returns the hash of the operation on which the payload was encoded.
#[tauri::command]
pub async fn publish(
    rpc: State<'_, Rpc>,
    payload: serde_json::Value,
    topic_type: TopicType,
    calendar_id: Option<CalendarId>,
    stream_name: Option<StreamName>,
    stream_type: Option<StreamType>,
) -> Result<Hash, RpcError> {
    debug!(
        command.name = "publish",
        command.calendar_id = calendar_id.as_ref().map(ToString::to_string),
        command.topic_type = topic_type.to_string(),
        "RPC request received"
    );
    let payload = serde_json::to_vec(&payload)?;
    let hash = rpc
        .publish(payload, topic_type, calendar_id, stream_name, stream_type)
        .await?;
    Ok(hash)
}

/// Publish an invite code to onto the invite overlay network.
#[tauri::command]
pub async fn publish_to_invite_code_overlay(
    rpc: State<'_, Rpc>,
    payload: serde_json::Value,
) -> Result<(), RpcError> {
    debug!(
        command.name = "publish_to_invite_code_overlay",
        "RPC request received"
    );

    let payload = serde_json::to_vec(&payload)?;
    rpc.publish_to_invite_code_overlay(payload).await?;
    Ok(())
}
