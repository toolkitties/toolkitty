import { invoke, Channel } from "@tauri-apps/api/core";
import { calendars, inviteCodes } from "$lib/api";
import { rejectPromise, resolvePromise } from "$lib/promiseMap";

export async function init() {
  // Create the stream channel to be passed to backend and add an `onMessage`
  // callback method to handle any events which are later sent from the
  // backend to here.
  const channel = new Channel<ChannelMessage>();
  channel.onmessage = onChannelMessage;

  // The start command must be called on app startup otherwise running the node
  // on the backend is blocked. This is because we need the stream channel to
  // be provided and passed into the node stream receiver task.
  await invoke("init", { channel });
}

async function onChannelMessage(message: ChannelMessage) {
  console.debug("received message on channel", message);

  // @TODO: We need to validate here if the received messages are correctly
  // formatted and contain all the required fields.
  // Related issue: https://github.com/toolkitties/toolkitty/issues/77

  if (message.event == "application") {
    await onApplicationMessage(message);
  } else if (
    message.event == "invite_codes_ready" ||
    message.event == "invite_codes"
  ) {
    await onInviteCodesMessage(message);
  } else if (message.event === "calendar_selected") {
    // @TODO: set selected calendar.
    console.log("calendar selected: ", message.calendarId);
  } else if (message.event === "subscribed_to_calendar") {
    // @TODO: handle subscribed_to_calendar event.
    console.log("subscribed to calendar: ", message.calendarId);
  } else if (message.event === "calendar_gossip_joined") {
    // @TODO: handle calendar_gossip_joined event.
    console.log("joined calendar gossip: ", message.calendarId);
  }
}

async function onApplicationMessage(message: ApplicationMessage) {
  try {
    await calendars.process(message);

    // Mark this operation as "processed", this can be used as a signal for the
    // frontend to change the UI now, for example change the state of a spinner
    // or redirect to another screen, etc.
    resolvePromise(message.meta.operationId);

    // Acknowledge that we have received and processed this operation.
    await invoke("ack", { operationId: message.meta.operationId });
  } catch (err) {
    console.error(`failed processing application event: ${err}`, message);
    rejectPromise(message.meta.operationId, err);
  }
}

async function onInviteCodesMessage(
  message: InviteCodesReadyMessage | InviteCodesMessage,
) {
  try {
    await inviteCodes.process(message);
  } catch (err) {
    console.error(`failed processing invite codes message: ${err}`, message);
  }
}
