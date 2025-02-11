import { invoke } from "@tauri-apps/api/core";
import { calendars, inviteCodes, access } from "$lib/api";
import { rejectPromise, resolvePromise } from "$lib/promiseMap";

/**
 * Main entry point to process incoming messages from the backend.
 *
 * Messages get processed by the regarding "sub processors" depending on their
 * type and source.
 *
 * ## Message Types
 *
 * There's roughly 3 types of message categories being processed here:
 *
 * 1. Application Messages: They contain application events which are processed
 *    by the backend, this is the actual data which gets persisted, for example
 *    created, updated or deleted spaces, calendar events, etc.
 * 2. Invite Codes Messages: Ephemeral messages used to help with resolving
 *    invite codes, they are not persisted and not processed by the backend.
 * 3. System Messages: Ephemeral messages indicating the status of the p2p
 *    connectivity and backend, for example if a gossip overlay was joined or
 *    another peer discoverered. This helps the frontend to reason about how
 *    well the application is connected to the network.
 *
 * ## Processor Design
 *
 * We want to guarantee "Eventual Consistency" and "Crash Resiliance". This is
 * achieved by this particular "stream processing" design which is inspired by
 * general "stream processing", "event sourcing" etc. patterns, described in
 * this diagram:
 *
 * ```
 *               ┌────────────────────────────────────────────┐
 *               │                                            │      FRONTEND
 *               │               User interface               │
 *               │                                            │
 *               └───▲────────────────────────────────────┬───┘
 *                   │                                    ▼
 *           ┌───────┼───────┐                       User Action
 *           │               │                            │
 *           │   Database    │                            │
 *           │               │                            │
 *           └───────────▲───┘                            │
 *                       │                                │
 * ──────────────────────┼────────────────────────────────┼──────────────────
 *                       │                                │        MIDDLEWARE
 *      Acknowledge      │                                │
 *     ┌─────────┐       │                                │
 *     │         │       │                                │
 *     │     ┌───┼───────┼───┐                            │
 *     │     │               │ Processor                  │
 *     │     │  Frontend     │                            │
 *     │     │  Stream       │                            │ Command
 *     │     │  Processing   │                      ┌─────▼──────┐
 *     │     │               │                      │Create Event│
 *     │     │               │                      └─────┬──────┘
 *     │     └───────▲───────┘                            │
 *     │             │                                    │
 *     │             │ via Tauri                          │ via Tauri
 *     │             │ channel                            │ "invoke"
 *     │             │                                    │
 * ────┼─────────────┼────────────────────────────────────┼──────────────────
 *     │             │                                    │           BACKEND
 *     │     ┌───────┼───────┐                            │
 *     │     │               │                            │ Application Event
 *     │     │               │           ┌────────────────▼─────────────────┐
 *     │     │   Backend     │           │Create & sign p2panda operation w.│
 *     │     │   Stream      │           │"event_created" payload           │
 *     │     │   Processing  │           └────────────────┬─────────────────┘
 *     │     │               │                            │
 * ┌───▼───┐ │               │                            │
 * │Stream │ │               │                            │
 * │Control│ │               │                            │
 * └───┬───┘ │               │                            │
 *     └─────┤               │                            │
 *           └───────▲───────┘                            │
 *                   │                                    │
 *                   │                                    │
 *                   │◄───────────────────────────────────┤
 *                   │                                    │
 *                   │                                    │
 *                   │ Receive from other peers           │ Publish
 *                   │                                    │
 *               ┌───┼────────────────────────────────────▼──┐
 *               │                                           │
 *               │                p2p network                │
 *               │                                           │
 *               └───────────────────────────────────────────┘
 * ```
 *
 * Commands are called from the UI or middleware. They create one or more
 * "application events" which get published on the p2p network, ready to be
 * processed by us and other peers.
 *
 * Application events we've created ourselves get processed by the backend
 * stream processor, forwarded to the frontend where they are further processed
 * (and finally acknowledged as "completed").
 *
 * Calling a command and creating the event does _not_ cause any state changes
 * yet. At this stage we simply announced our "intent" that we want to change
 * something on the network. The actual state change happens during processing.
 *
 * ## Acknowledgements
 *
 * Application messages need to be "acknowledged" when they have been
 * successfully processed. This is part of the "stream controller" who assures
 * crash resiliance. Whenever our application crashes (or simply gets closed by
 * the user) we can repeat unprocessed application messages whenever the
 * application starts again. Through "acks" we tell the stream controller that
 * we don't need to process this message again.
 *
 * Other "ephemeral" messages like Invite Codes Messages or System Messages do
 * not need to be acknowledged.
 *
 * ## Re-Plays
 *
 * Since application messages can be "re-played" after an error occurred etc. we
 * have to make sure that all processor methods are "idempotent", meaning that if
 * a state-change has been performed already before, it is not applied again when
 * the message gets processed a second time.
 */
export async function process(message: ChannelMessage) {
  console.debug("received message to process", message);

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
  } else if (
    message.event == "calendar_selected" ||
    message.event == "subscribed_to_calendar" ||
    message.event == "network_event"
  ) {
    await onSystemMessage(message);
  }
}

async function onApplicationMessage(message: ApplicationMessage) {
  try {
    await calendars.process(message);
    await access.process(message);

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

async function onSystemMessage(message: SystemMessage) {
  if (message.event === "calendar_selected") {
    // @TODO: set selected calendar.
    console.log("calendar selected: ", message.calendarId);
  } else if (message.event === "subscribed_to_calendar") {
    console.log("subscribed to calendar: ", message.calendarId);
  } else if (message.event === "network_event") {
    // console.log("network system event received: ", message);
  }
}
