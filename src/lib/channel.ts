import { invoke, Channel } from "@tauri-apps/api/core";

type ChannelState = {
  channel: Channel<ChannelMessage>;
  ready: Promise<void>;
  replayInterval: ReturnType<typeof setInterval>;
};

type AppWindow = Window & { toolkittyChannel?: ChannelState };

export function init(): Promise<void> {
  const appWindow = window as AppWindow;
  let state = appWindow.toolkittyChannel;

  if (!state) {
    const channel = new Channel<ChannelMessage>();
    let isReplaying = false;
    const replayInterval = setInterval(async () => {
      if (isReplaying) return;
      isReplaying = true;
      try {
        const { pendingQueue, processMessage } = await import("$lib/processor");
        for (const [, message] of pendingQueue) {
          await processMessage(message);
        }
      } catch (error) {
        console.error("Could not replay pending messages:", error);
      } finally {
        isReplaying = false;
      }
    }, 200);

    // Backend stream processing cannot start until this channel is registered.
    const ready = invoke<void>("init", { channel });
    state = { channel, ready, replayInterval };
    appWindow.toolkittyChannel = state;
    void ready.catch(() => {
      if (appWindow.toolkittyChannel === state) {
        clearInterval(replayInterval);
        delete appWindow.toolkittyChannel;
      }
    });
  }

  // Refresh the handler on each layout mount (also after a Vite hot reload),
  // without starting another backend channel or another replay interval.
  state.channel.onmessage = async (message) => {
    const { processMessage } = await import("$lib/processor");
    await processMessage(message);
  };

  return state.ready;
}
