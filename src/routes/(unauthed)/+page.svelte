<script lang="ts">
  import { PinInput, Toggle } from "bits-ui";
  import { goto } from "$app/navigation";
  import { inviteCodes, calendars } from "$lib/api";
  import { db } from "$lib/db";
  import { appConfigDir } from "@tauri-apps/api/path";

  let value: string[] | undefined = [];

  let unlocked = true;
  let progress: "dormant" | "pending" = "dormant";
  let timedOut: boolean = false;
  let pinInputType: "text" | "password" = "password";
  $: pinInputType = unlocked ? "text" : "password";

  // db.delete({ disableAutoOpen: false });

  async function join(event: Event) {
    event.preventDefault();

    if (!value) return;

    let calendar;
    try {
      progress = "pending";
      // @TODO: We probably want a "higher-level" API method here which handles
      // the whole "joinExistingCalendar" onboarding flow by 1. resolve invite
      // code 2. add resolved calendar to database & set it to "active" 3.
      // maybe more ..
      calendar = await inviteCodes.resolve(value.join(""));
    } catch (err) {
      timedOut = true;
      progress = "dormant";
      console.error(err);
      return;
    }

    await calendars.select(calendar.id);
    await calendars.subscribe(calendar.id);

    goto(`/join?code=${calendar.id}`);
  }
</script>

<h1 class="text-3xl text-center">Toolkitty 🐈</h1>

<form class="flex flex-col gap-4 grow justify-center mx-auto" onsubmit={join}>
  {#if progress == "dormant"}
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
  {:else if progress == "pending"}
    <p>Searching for calendar</p>
  {/if}
</form>

{#if timedOut}
  <p>Calendar not found</p>
{/if}

<a
  href="/create"
  class="border border-black rounded p-4 text-center"
  type="submit">Create</a
>
