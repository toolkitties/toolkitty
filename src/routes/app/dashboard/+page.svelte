<script lang="ts">
  import type { PageProps } from "./$types";
  import RequestDialog from "./RequestDialog.svelte";
  import { bookings } from "$lib/api";

  let { data }: PageProps = $props();

  let pendingRequests = bookings.findPending(data.activeCalendarId!, {});
</script>

<h1>Dashboard</h1>

<section>
  {#if $pendingRequests}
    <h3>Pending requests</h3>
    {#each $pendingRequests as request}
      <RequestDialog {request} />
    {/each}
  {/if}
</section>
