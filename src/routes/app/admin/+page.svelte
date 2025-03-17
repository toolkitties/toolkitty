<script lang="ts">
  import { toast } from "$lib/toast.svelte";
  import type { PageProps } from "./$types";
  import type { Observable } from "dexie";
  import RequestDialog from "./RequestDialog.svelte";
  import { users, access } from "$lib/api";
  import { liveQuery } from "dexie";

  let { data }: PageProps = $props();
  let calendarUsers: Observable<User[]>;
  let pendingAccessRequests: Observable<AccessRequest[]>;

  if (data.userRole === "admin") {
    calendarUsers = liveQuery(() => {
      return users.findAll(data.activeCalendarId!);
    });
    pendingAccessRequests = liveQuery(() => {
      return access.getPending(data.activeCalendarId!);
    });
  }

  async function copyToClipboard(text: string): Promise<void> {
    if (text)
      try {
        await navigator.clipboard.writeText(text);
        toast.success("invite code copied!");
      } catch (err) {
        console.error("Failed to copy: ", err);
        // TODO: show toast error message
        toast.error("failed to copy invite code!");
      }
  }
</script>

<section class="section">
  <h2>Share</h2>
  <button class="button" onclick={() => copyToClipboard(data.shareCode)}>
    <span>🔐 calendar code: {data.shareCode}</span>
    <span>copy</span>
  </button>
</section>

{#if data.userRole === "admin"}
  <section class="section">
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
        <RequestDialog data={user} />
      {/each}
    {/if}
  </section>
{/if}
