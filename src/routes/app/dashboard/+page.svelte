<script lang="ts">
  import type { PageProps } from "./$types";
  import RequestDialog from "./RequestDialog.svelte";
  import { bookings } from "$lib/api";
  import { liveQuery } from "dexie";

  let { data }: PageProps = $props();

  let pendingRequests = liveQuery(() =>
    bookings.findPending(data.activeCalendarId!, {}),
  );
</script>

<h1>Dashboard</h1>

<section>
  {#if $pendingRequests}
    <h3>Pending requests</h3>
    {#each $pendingRequests as request (request.id)}
      <RequestDialog {request} />
    {/each}
  {/if}
</section>
