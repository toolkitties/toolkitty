<script lang="ts">
  import type { PageProps } from "./$types";
  import Request from "$lib/components/dialog/Request.svelte";

  let { data }: PageProps = $props();

  let copyText = $state("copy");

  async function copyToClipboard(text: string): Promise<void> {
    if (text)
      try {
        await navigator.clipboard.writeText(text);
        console.log("Content copied to clipboard");
        copyText = "copied";
        setTimeout(() => {
          copyText = "copy";
        }, 2000);
      } catch (err) {
        console.error("Failed to copy: ", err);
        // TODO: show toast error message
        copyText = "error";
      }
  }
</script>

<section class="section mt-60">
  <h2>Share</h2>
  <button class="button" onclick={() => copyToClipboard(data.shareCode)}>
    <span>🔐 calendar code: {data.shareCode}</span>
    <span>{copyText}</span>
  </button>
</section>

<section class="section">
  <h2>Users</h2>
  <p>
    There are three roles at ToolKitties. Public members can view the program,
    contributors can add to it and admins can edit the calendar presets. New
    arrivals will be listed at the top in red, change their permissions to let
    them in!
  </p>
  {#if data.pendingRequests}
    {#each data.pendingRequests as request}
      <p>{request.from}</p>
    {/each}
  {/if}
</section>
