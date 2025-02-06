use p2panda_core::Hash;
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use serde::Serialize;
use tauri::{ipc::Channel, State};
use thiserror::Error;
use tokio::sync::Mutex;

use crate::app::Context;
use crate::messages::ChannelEvent;
use crate::node::operation::{create_operation, CalendarId, Extensions};
use crate::node::{PublishError, StreamControllerError};
use crate::topic::NetworkTopic;

#[tauri::command]
pub async fn init(
    state: State<'_, Mutex<Context>>,
    channel: Channel<ChannelEvent>,
) -> Result<(), InitError> {
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
    let mut state = state.lock().await;
    state.node.ack(operation_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn subscribe_to_calendar(
    state: State<'_, Mutex<Context>>,
    calendar_id: CalendarId,
) -> Result<(), PublishError> {
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

#[tauri::command]
pub async fn select_calendar(
    state: State<'_, Mutex<Context>>,
    calendar_id: CalendarId,
) -> Result<(), StreamControllerError> {
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

#[tauri::command]
pub async fn create_calendar(
    state: State<'_, Mutex<Context>>,
    payload: serde_json::Value,
) -> Result<Hash, PublishError> {
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

#[tauri::command]
pub async fn publish_calendar_event(
    state: State<'_, Mutex<Context>>,
    payload: serde_json::Value,
    calendar_id: CalendarId,
) -> Result<Hash, PublishError> {
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

#[tauri::command]
pub async fn publish_to_invite_code_overlay(
    state: State<'_, Mutex<Context>>,
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
