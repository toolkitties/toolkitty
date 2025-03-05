import { invoke, Channel } from "@tauri-apps/api/core";
import { processMessage } from "$lib/processor";

export async function init() {
  // Create the stream channel to be passed to backend and add an `onMessage`
  // callback method to handle any events which are later sent from the
  // backend to here.
  const channel = new Channel<ChannelMessage>();
  channel.onmessage = processMessage;

  // The start command must be called on app startup otherwise running the node
  // on the backend is blocked. This is because we need the stream channel to
  // be provided and passed into the node stream receiver task.
  await invoke("init", { channel });
}
