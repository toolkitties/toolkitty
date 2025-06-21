<script lang="ts">
  import { toast } from "$lib/toast.svelte";
  import type { PageProps } from "./$types";
  import RequestDialog from "./RequestDialog.svelte";
  import { users, access } from "$lib/api";
  import { liveQuery } from "dexie";
  import LockIcon from "$lib/components/icons/LockIcon.svelte";
  import LinkIcon from "$lib/components/icons/LinkIcon.svelte";

  let { data }: PageProps = $props();

  let calendarUsers = liveQuery(() => {
    return users.findAll(data.activeCalendarId!);
  });

  let pendingAccessRequests = liveQuery(() => {
    return access.getPending(data.activeCalendarId!);
  });

  async function copyToClipboard(
    text: string,
    successMessage: string = "invite code copied!",
  ): Promise<void> {
    if (text)
      try {
        await navigator.clipboard.writeText(text);
        toast.success(successMessage);
      } catch (err) {
        console.error("Failed to copy: ", err);
        toast.error("failed to copy!");
      }
  }
</script>

<section
  class="section flex flex-col items-center p-2.5 mt-3.5 mb-3.5 gap-2 bg-purple-very-light rounded-[6px] flex-none order-1 flex-grow-0 z-10"
>
  <h2>Share</h2>
  <LockIcon />
  <div
    class="w-full bg-white border border-black rounded flex items-center justify-between p-2 px-3"
  >
    <span class="flex items-center gap-2 text-[17px]">
      <LockIcon size={18} />
      calendar code: {data.shareCode}
    </span>
    <button
      class="button-small button-light-blue"
      onclick={() => copyToClipboard(data.shareCode, "invite code copied!")}
    >
      copy
    </button>
  </div>
  <div
    class="w-full bg-white border border-black rounded flex items-center justify-between p-2 px-3"
  >
    <!-- TODO: add calendar link -->
    <span class="flex items-center gap-2 text-[17px]">
      <LinkIcon size={19} />
      calendar link
    </span>
    <button
      class="button-small button-light-blue"
      onclick={() => copyToClipboard("calendar link", "invite link copied!")}
    >
      copy
    </button>
  </div>
</section>

<section
  class="section flex flex-col items-center pt-3.5 pb-3 px-3.5 gap-2 bg-purple-very-light rounded-[6px] flex-none order-1 flex-grow-0 z-10 mb-3.5 text-center"
>
  <!-- TODO: Only show if we are user -->
  <h2>Users</h2>
  <!-- <p>
    There are three roles at ToolKitties. Public members can view the program,
    contributors can add to it and admins can edit the calendar presets. New
    arrivals will be listed at the top in red, change their permissions to let
    them in!
  </p> -->

  {#if $pendingAccessRequests}
    {#each $pendingAccessRequests as request (request.id)}
      <!-- TODO: go through users instead of pending requests -->
      <RequestDialog data={request} />
    {/each}
  {/if}
  {#if $calendarUsers}
    {#each $calendarUsers as user (user.publicKey)}
      <RequestDialog data={user} publicKey={data.publicKey} />
    {/each}
  {/if}
</section>

<section
  class="section flex flex-col items-center pt-3.5 pb-3 px-3.5 gap-2 bg-purple-very-light rounded-[6px] flex-none order-1 flex-grow-0 z-10 mb-3.5 text-center"
>
  <h2>Leave Calendar</h2>
  <p>
    To re-join you will have to request access again. Your data from this
    session won't be recovered.
  </p>
  <!-- TODO add leave calendar function -->
  <button class="button button-red w-full">leave</button>
</section>
