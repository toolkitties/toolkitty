import { invoke, Channel } from "@tauri-apps/api/core";
import { calendars, inviteCodes } from "$lib/api";
import { rejectPromise, resolvePromise } from "$lib/promiseMap";

export async function init() {
  // Create the stream channel to be passed to backend and add an `onMessage`
  // callback method to handle any events which are later sent from the
  // backend.
  const channel = new Channel<ChannelMessage>();
  channel.onmessage = async (message) => {
    console.log("Received message on channel", message);

    if (message.event == "application") {
      try {
        await calendars.process(message);

        // Mark this operation as "processed", this can be used as a signal
        // for the frontend to change the UI now, for example change the state
        // of a spinner or redirect to another screen, etc.
        resolvePromise(message.meta.operationId);

        // Acknowledge that we have received and processed this operation.
        await invoke("ack", { operationId: message.meta.operationId });
      } catch (err) {
        console.error(`Failed processing application event: ${err}`, message);
        rejectPromise(message.meta.operationId, err);
      }
    } else if (
      message.event == "invite_codes_ready" ||
      message.event == "invite_codes"
    ) {
      try {
        await inviteCodes.process(message);
      } catch (err) {
        console.error(`Failed processing invite codes message: ${err}`, message);
      }
    }
  };

  // The start command must be called on app startup otherwise running the
  // node on the backend is blocked. This is because we need the stream
  // channel to be provided and passed into the node stream receiver task.
  await invoke("init", { channel });
}
