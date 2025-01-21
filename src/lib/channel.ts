import { invoke, Channel } from "@tauri-apps/api/core";
import {
  handleInviteCodeResponse,
  respondInviteCodeRequest,
  setSelectedCalendar,
  updateCalendar,
} from "./api";
import { resolvePromise } from "./promiseMap";

export async function init() {
  // Create the stream channel to be passed to backend and add an `onMessage`
  // callback method to handle any events which are later sent from the
  // backend.
  const streamChannel = new Channel<ChannelMessage>();
  streamChannel.onmessage = async (message) => {
    console.log(message);

    if (message.event == "application") {
      console.log(`got stream event with id ${message.meta.operationId}`);
      if (message.data.type === "calendar_created") {
        let calendar = {
          id: message.meta.calendarId,
          name: message.data.data.title,
        };

        updateCalendar(calendar);
        resolvePromise(message.meta.operationId);
      }

      // Acknowledge that we have received and processed this operation.
      await invoke("ack", { operationId: message.meta.operationId });
    } else if (message.event == "invite_codes_ready") {
      console.log("invite codes ready");
    } else if (message.event == "invite_codes") {
      if (message.data.messageType === "request") {
        respondInviteCodeRequest(message.data.inviteCode);
      }

      if (message.data.messageType === "response") {
        handleInviteCodeResponse(message.data);
      }
    } else if (message.event === "calendar_selected") {
      await setSelectedCalendar(message.calendarId);
      console.log("calendar_selected: ", message.calendarId);
    }
  };

  // The start command must be called on app startup otherwise running the
  // node on the backend is blocked. This is because we need the stream
  // channel to be provided and passed into the node stream receiver task.
  await invoke("init", { streamChannel });
}
