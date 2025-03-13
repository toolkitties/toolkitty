<script lang="ts">
  import { toast } from "$lib/toast.svelte";
  import type { PageProps } from "./$types";
  import RequestDialog from "./RequestDialog.svelte";

  let { data }: PageProps = $props();

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

<section class="section">
  <h2>Users</h2>
  <!-- <p>
    There are three roles at ToolKitties. Public members can view the program,
    contributors can add to it and admins can edit the calendar presets. New
    arrivals will be listed at the top in red, change their permissions to let
    them in!
  </p> -->
  {#if data.pendingRequests.length > 0}
    {#each data.pendingRequests as request (request.id)}
      <RequestDialog {request} />
    {/each}
  {:else}
    <p>
      No one has requested access yet, copy the calendar code above to invite
      others
    </p>
  {/if}
</section>
