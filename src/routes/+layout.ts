import { invoke, Channel } from "@tauri-apps/api/core";

// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const prerender = true;
export const ssr = false;

// Create the stream channel to be passed to backend and add an `onMessage`
// callback method to handle any events which are later sent from the
// backend.
const streamChannel = new Channel<ChannelMessage>();
streamChannel.onmessage = async (message) => {
    console.log(message);

    if (message.event == "application") {
    console.log(`got stream event with id ${message.meta.operationId}`);

    // Acknowledge that we have received and processed this operation.
    await invoke("ack", { operationId: message.meta.operationId });
    } else if (message.event == "invite_code_ready") {
    console.log("invite codes ready");
    } else if (message.event == "invite_code") {
    console.log("invite codes")
    }
};

// The start command must be called on app startup otherwise running the
// node on the backend is blocked. This is because we need the stream
// channel to be provided and passed into the node stream receiver task.
await invoke("init", { streamChannel });
