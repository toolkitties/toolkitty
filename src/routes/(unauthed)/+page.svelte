<script lang="ts">
  import { invoke, Channel } from "@tauri-apps/api/core";
  import { PinInput, Toggle } from "bits-ui";
  import { goto } from "$app/navigation";
  import { stringify } from "postcss";

  let value: string[] | undefined = [];

  let unlocked = true;
  let pinInputType: "text" | "password" = "password";
  $: pinInputType = unlocked ? "text" : "password";

  type EventMeta = {
    logId: {
      calendarId: string;
    };
    operationId: string;
    publicKey: string;
  }

  type StreamEvent =
    | {
        meta: EventMeta;
        event: "application";
        data: ApplicationEvent;
      }
    | {
        meta: EventMeta;
        event: "error";
        data: string;
      };

  type InviteCodeReadyEvent = {
    event: "invite_code_ready";
  };

  type InviteCodeEvent = {
    event: "invite_code";
    data: any; // @TODO
  };

  type ChannelEvent = StreamEvent | InviteCodeReadyEvent | InviteCodeEvent;

  type ApplicationEvent = {
    type: "EventCreated";
    data: {
      title: string;
    };
  };

  async function join(event: Event) {
    event.preventDefault();

    // @TODO: Just doing all this here for testing purposes, move somewhere
    // sensible later, of course.
    const calendarId = "5a7bc8522433759260bdcb77648890b5da10297ed477776611c3c5f83342b025";

    // Create the stream channel to be passed to backend and add an `onMessage`
    // callback method to handle any events which are later sent from the
    // backend.
    const streamChannel = new Channel<ChannelEvent>();
    streamChannel.onmessage = async (message) => {
      console.log(message);

      if (message.event == "application") {
        console.log(`got stream event with id ${message.meta.operationId}`);

        // Acknowledge that we have received and processed this operation.
        await invoke("ack", { operationId: message.meta.operationId });
      } else if (message.event == "invite_codes_ready") {
        console.log("invite codes ready");
      } else if (message.event == "invite_codes") {
        console.log("invite codes")
      }
    };

    // The start command must be called on app startup otherwise running the
    // node on the backend is blocked. This is because we need the stream
    // channel to be provided and passed into the node stream receiver task.
    await invoke("init", { streamChannel });

    await invoke("select_calendar", { calendarId });

    // Just some app data.
    const payload = {
      type: "EventCreated",
      data: { title: "My Cool Event" },
    };

    // Publish the app event via the publish command.
    console.log(`publish application data: `, payload);
    await invoke("publish", { payload, calendarId });

    goto(`/join?code=${value}`);
  }
</script>

<h1 class="text-3xl text-center">Toolkitty 🐈</h1>

<form class="flex flex-col gap-4 grow justify-center mx-auto" onsubmit={join}>
  <PinInput.Root
    bind:value
    class="flex items-center gap-2"
    type={pinInputType}
    placeholder="0"
  >
    <PinInput.Input
      class="flex h-input w-10 select-none rounded-input border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
    />
    <PinInput.Input
      class="flex h-input w-10 select-none rounded-input border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
    />
    <PinInput.Input
      class="flex h-input w-10 select-none rounded-input border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
    />
    <PinInput.Input
      class="flex h-input w-10 select-none rounded-input border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
    />
    <PinInput.HiddenInput />
    <Toggle.Root
      aria-label="toggle code visibility"
      class="inline-flex size-10 items-center justify-center rounded-[9px] text-foreground/40 transition-all hover:bg-muted active:scale-98 active:bg-dark-10 active:data-[state=on]:bg-dark-10"
      bind:pressed={unlocked}
    >
      {#if unlocked}
        <span>Hide</span>
      {:else}
        <span>Show</span>
      {/if}
    </Toggle.Root>
  </PinInput.Root>
  <button class="border border-black rounded p-4" type="submit">Join</button>
</form>
<a
  href="/create"
  class="border border-black rounded p-4 text-center"
  type="submit">Create</a
>
