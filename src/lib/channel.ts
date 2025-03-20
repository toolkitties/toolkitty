import { invoke, Channel } from "@tauri-apps/api/core";
import { pendingQueue, processMessage } from "$lib/processor";

export async function init() {
  // Create the stream channel to be passed to backend and add an `onMessage`
  // callback method to handle any events which are later sent from the
  // backend to here.
  const channel = new Channel<ChannelMessage>();
  channel.onmessage = processMessage;

  // @TODO: is this there a better place to be starting this interval?
  //
  // Attempt to process any messages in the pending queue every 200ms.
  setInterval(async () => {
    for (const [, message] of pendingQueue) {
      await processMessage(message);
    }
  }, 200);

  // The start command must be called on app startup otherwise running the node
  // on the backend is blocked. This is because we need the stream channel to
  // be provided and passed into the node stream receiver task.
  await invoke("init", { channel });
}
