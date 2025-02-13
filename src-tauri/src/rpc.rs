use p2panda_core::{Hash, PublicKey};
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, State};
use thiserror::Error;
use tokio::sync::Mutex;
use tracing::debug;

use crate::app::Context;
use crate::messages::ChannelEvent;
use crate::node::operation::{create_operation, CalendarId, Extensions, LogType};
use crate::topic::{NetworkTopic, TopicType};

/// Initialize the app by passing it a channel from the frontend.
#[tauri::command]
pub async fn init(
    state: State<'_, Mutex<Context>>,
    channel: Channel<ChannelEvent>,
) -> Result<(), RpcError> {
    debug!(command.name = "init", "RPC request received");

    let state = state.lock().await;
    if state.channel_set {
        return Err(RpcError::SetStreamChannelError);
    }

    if state.channel_tx.send(channel).await.is_err() {
        return Err(RpcError::OneshotChannelError);
    };

    Ok(())
}

/// The public key of the local node.
#[tauri::command]
pub async fn public_key(state: State<'_, Mutex<Context>>) -> Result<PublicKey, RpcError> {
    debug!(command.name = "public_key", "RPC request received");

    let state = state.lock().await;
    let public_key = state.node.private_key.public_key();
    Ok(public_key)
}

/// Acknowledge operations to mark them as successfully processed in the stream controller.
#[tauri::command]
pub async fn ack(state: State<'_, Mutex<Context>>, operation_id: Hash) -> Result<(), RpcError> {
    debug!(
        command.name = "ack",
        command.operation_id = operation_id.to_hex(),
        "RPC request received"
    );

    let mut state = state.lock().await;
    state.node.ack(operation_id).await?;
    Ok(())
}

/// Add an author to a calendar.
///
/// This means that we will actively sync operations from this author for the specific calendar.
#[tauri::command]
pub async fn add_calendar_author(
    state: State<'_, Mutex<Context>>,
    public_key: PublicKey,
    calendar_id: CalendarId,
    topic_type: TopicType,
) -> Result<(), RpcError> {
    debug!(
        command.name = "add_calendar_author",
        command.public_key = public_key.to_hex(),
        command.topic_type = topic_type.to_string(),
        "RPC request received"
    );

    let state = state.lock().await;

    let topic = match topic_type {
        TopicType::Inbox => NetworkTopic::CalendarInbox { calendar_id },
        TopicType::Data => NetworkTopic::CalendarData { calendar_id },
    };
    state.topic_map.add_author(public_key, topic).await;
    Ok(())
}

/// Subscribe to a specific calendar by it's id.
#[tauri::command]
pub async fn subscribe(
    state: State<'_, Mutex<Context>>,
    calendar_id: CalendarId,
    topic_type: TopicType,
) -> Result<(), RpcError> {
    debug!(
        command.name = "subscribe",
        command.calendar_id = calendar_id.0.to_hex(),
        command.topic_type = topic_type.to_string(),
        "RPC request received"
    );

    let mut state = state.lock().await;

    let topic = match topic_type {
        TopicType::Inbox => NetworkTopic::CalendarInbox { calendar_id },
        TopicType::Data => NetworkTopic::CalendarData { calendar_id },
    };

    if state
        .subscriptions
        .insert(topic.id(), topic.clone())
        .is_none()
    {
        state
            .node
            .subscribe_processed(&topic)
            .await
            .expect("can subscribe to topic");

        state
            .to_app_tx
            .send(ChannelEvent::SubscribedToCalendar(calendar_id, topic_type))?;
    }

    Ok(())
}

/// Select a calendar we have already subscribed to.
///
/// Calling this method causes all events for calendars other than the selected one to be filtered
/// out of the channel stream. The frontend will only receive events of the selected calendar.
///
/// Any operations which arrived at the node since we last selected this calendar will be replayed.
#[tauri::command]
pub async fn select_calendar(
    state: State<'_, Mutex<Context>>,
    calendar_id: CalendarId,
) -> Result<(), RpcError> {
    debug!(
        command.name = "select_calendar",
        command.calendar_id = calendar_id.0.to_hex(),
        "RPC request received"
    );

    let mut state = state.lock().await;
    state.selected_calendar = Some(calendar_id);

    state
        .to_app_tx
        .send(ChannelEvent::CalendarSelected(calendar_id))?;

    // Ask stream controller to re-play all operations from logs inside this topic which haven't
    // been acknowledged yet by the frontend.
    if let Some(logs) = state
        .topic_map
        .get(&NetworkTopic::CalendarInbox { calendar_id })
        .await
    {
        state.node.replay(logs).await?;
    }

    if let Some(logs) = state
        .topic_map
        .get(&NetworkTopic::CalendarData { calendar_id })
        .await
    {
        state.node.replay(logs).await?;
    }

    Ok(())
}

/// Create a new calendar.
///
/// NOTE: subscribing to a calendar does _not_ occur as part of this method and must be requested
/// from the frontend with a further call to `subscribe_to_calendar`
///
/// Returns the hash of the operation on which the calendar payload was encoded.
#[tauri::command]
pub async fn create_calendar(
    state: State<'_, Mutex<Context>>,
    payload: serde_json::Value,
) -> Result<Hash, RpcError> {
    debug!(command.name = "create_calendar", "RPC request received");

    let mut state = state.lock().await;
    let private_key = state.node.private_key.clone();

    let payload = serde_json::to_vec(&payload)?;

    let extensions = Extensions::default();

    // @TODO(adz): Memory stores are infallible right now but we'll switch to a SQLite-based
    // one soon and then we need to handle this error here:
    let (header, body) = create_operation(
        &mut state.node.store,
        &private_key,
        extensions,
        Some(&payload),
    )
    .await;

    state.node.ingest(&header, body.as_ref()).await?;
    let hash = header.hash();

    Ok(hash)
}

/// Publish an event to a calendar topic.
///
/// Returns the hash of the operation on which the payload was encoded.
#[tauri::command]
pub async fn publish(
    state: State<'_, Mutex<Context>>,
    payload: serde_json::Value,
    calendar_id: CalendarId,
    topic_type: TopicType,
) -> Result<Hash, RpcError> {
    debug!(
        command.name = "publish",
        command.calendar_id = calendar_id.0.to_hex(),
        command.topic_type = topic_type.to_string(),
        "RPC request received"
    );

    let mut state = state.lock().await;
    let private_key = state.node.private_key.clone();

    let payload = serde_json::to_vec(&payload)?;

    let (log_type, topic) = match topic_type {
        TopicType::Inbox => (LogType::Inbox, NetworkTopic::CalendarInbox { calendar_id }),
        TopicType::Data => (LogType::Data, NetworkTopic::CalendarData { calendar_id }),
    };

    let extensions = Extensions {
        calendar_id: Some(calendar_id),
        log_type: Some(log_type),
        ..Default::default()
    };

    let (header, body) = create_operation(
        &mut state.node.store,
        &private_key,
        extensions,
        Some(&payload),
    )
    .await;

    state
        .node
        .publish_to_stream(&topic, &header, body.as_ref())
        .await?;

    debug!("publish operation: {}", header.hash());

    Ok(header.hash())
}

/// Publish an invite code to onto the invite overlay network.
#[tauri::command]
pub async fn publish_to_invite_code_overlay(
    state: State<'_, Mutex<Context>>,
    payload: serde_json::Value,
) -> Result<(), RpcError> {
    debug!(
        command.name = "publish_to_invite_code_overlay",
        "RPC request received"
    );

    let mut state = state.lock().await;
    // @TODO: Handle error.
    let payload = serde_json::to_vec(&payload)?;
    state
        .node
        .publish_ephemeral(&NetworkTopic::InviteCodes, &payload)
        .await?;
    Ok(())
}

#[derive(Debug, Error)]
pub enum RpcError {
    #[error("oneshot channel receiver closed")]
    OneshotChannelError,

    #[error("stream channel already set")]
    SetStreamChannelError,

    #[error(transparent)]
    StreamControllerError(#[from] crate::node::StreamControllerError),

    #[error(transparent)]
    PublishError(#[from] crate::node::PublishError),

    #[error("payload decoding failed")]
    SerdeError(#[from] serde_json::Error),

    #[error("sending message on channel failed")]
    ChannelSenderError(#[from] tokio::sync::broadcast::error::SendError<ChannelEvent>),
}

impl Serialize for RpcError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
