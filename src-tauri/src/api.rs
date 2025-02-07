use p2panda_core::Hash;
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use serde::Serialize;
use tauri::{ipc::Channel, State};
use thiserror::Error;
use tokio::sync::Mutex;
use tracing::debug;

use crate::app::Context;
use crate::messages::ChannelEvent;
use crate::node::operation::{create_operation, CalendarId, Extensions};
use crate::node::{PublishError, StreamControllerError};
use crate::topic::NetworkTopic;

/// Initialize the app by passing it a channel from the frontend.
#[tauri::command]
pub async fn init(
    state: State<'_, Mutex<Context>>,
    channel: Channel<ChannelEvent>,
) -> Result<(), InitError> {
    debug!(command.name = "init", "RPC request received");

    let state = state.lock().await;
    if state.channel_set {
        return Err(InitError::SetStreamChannelError);
    }

    if state.channel_tx.send(channel).await.is_err() {
        return Err(InitError::OneshotChannelError);
    };

    Ok(())
}

/// Acknowledge operations to mark them as successfully processed in the stream controller.
#[tauri::command]
pub async fn ack(
    state: State<'_, Mutex<Context>>,
    operation_id: Hash,
) -> Result<(), StreamControllerError> {
    debug!(
        command.name = "ack",
        command.operation_id = operation_id.to_hex(),
        "RPC request received"
    );

    let mut state = state.lock().await;
    state.node.ack(operation_id).await?;
    Ok(())
}

/// Subscribe to a specific calendar by it's id.
#[tauri::command]
pub async fn subscribe_to_calendar(
    state: State<'_, Mutex<Context>>,
    calendar_id: CalendarId,
) -> Result<(), PublishError> {
    debug!(
        command.name = "subscribe_to_calendar",
        command.calendar_id = calendar_id.0.to_hex(),
        "RPC request received"
    );

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
) -> Result<(), StreamControllerError> {
    debug!(
        command.name = "select_calendar",
        command.calendar_id = calendar_id.0.to_hex(),
        "RPC request received"
    );

    let mut state = state.lock().await;

    state.selected_calendar = Some(calendar_id);

    // Ask stream controller to re-play all operations from logs inside this topic which haven't
    // been acknowledged yet by the frontend.
    if let Some(logs) = state
        .topic_map
        .get(&NetworkTopic::Calendar { calendar_id })
        .await
    {
        state.node.replay(logs).await?;
    }

    state
        .to_app_tx
        .send(ChannelEvent::CalendarSelected(calendar_id))
        .expect("send to_app_tx");

    Ok(())
}

/// Create a new calendar and subscribe to it.
///
/// Returns the hash of the operation on which the calendar payload was encoded.
#[tauri::command]
pub async fn create_calendar(
    state: State<'_, Mutex<Context>>,
    payload: serde_json::Value,
) -> Result<Hash, PublishError> {
    debug!(command.name = "create_calendar", "RPC request received");

    let mut state = state.lock().await;
    let private_key = state.node.private_key.clone();

    // @TODO: Handle error.
    let payload = serde_json::to_vec(&payload).unwrap();

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

    let hash = header.hash();
    let calendar_id = hash.into();
    let topic = NetworkTopic::Calendar { calendar_id };

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

/// Publish an event to the calendar topic.
///
/// Returns the hash of the operation on which the payload was encoded.
#[tauri::command]
pub async fn publish_calendar_event(
    state: State<'_, Mutex<Context>>,
    payload: serde_json::Value,
    calendar_id: CalendarId,
) -> Result<Hash, PublishError> {
    debug!(
        command.name = "publish_calendar_event",
        command.calendar_id = calendar_id.0.to_hex(),
        "RPC request received"
    );

    let mut state = state.lock().await;
    let private_key = state.node.private_key.clone();

    // @TODO: Handle error.
    let payload = serde_json::to_vec(&payload).unwrap();

    let extensions = Extensions {
        calendar_id: Some(calendar_id),
        ..Default::default()
    };

    let (header, body) = create_operation(
        &mut state.node.store,
        &private_key,
        extensions,
        Some(&payload),
    )
    .await;

    let topic = NetworkTopic::Calendar { calendar_id };

    state
        .node
        .publish_to_stream(&topic, &header, body.as_ref())
        .await?;

    Ok(header.hash())
}

/// Publish an invite code to onto the invite overlay network.
#[tauri::command]
pub async fn publish_to_invite_code_overlay(
    state: State<'_, Mutex<Context>>,
    payload: serde_json::Value,
) -> Result<(), PublishError> {
    debug!(
        command.name = "publish_to_invite_code_overlay",
        "RPC request received"
    );

    let mut state = state.lock().await;
    // @TODO: Handle error.
    let payload = serde_json::to_vec(&payload).unwrap();
    state
        .node
        .publish_ephemeral(&NetworkTopic::InviteCodes, &payload)
        .await?;
    Ok(())
}

#[derive(Debug, Error)]
pub enum InitError {
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
