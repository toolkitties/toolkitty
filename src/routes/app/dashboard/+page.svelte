<script lang="ts">
  import type { PageProps } from "./$types";
  import RequestDialog from "./RequestDialog.svelte";
  import { bookings, events, resources, spaces } from "$lib/api";
  import { liveQuery } from "dexie";

  let { data }: PageProps = $props();

  let pendingRequests = liveQuery(() =>
    bookings.findPending(data.activeCalendarId!, {}),
  );

  let mySpaces = liveQuery(() =>
    spaces.findByOwner(data.activeCalendarId!, data.publicKey),
  );

  let myResources = liveQuery(() =>
    resources.findByOwner(data.activeCalendarId!, data.publicKey),
  );

  let myEvents = liveQuery(() =>
    events.findByOwner(data.activeCalendarId!, data.publicKey),
  );
</script>

<h1>Dashboard</h1>

<section class="mb-8">
  <h3>pending requests</h3>
  {#if $pendingRequests?.length > 0}
    {#each $pendingRequests as request (request.id)}
      <RequestDialog {request} />
    {/each}
  {:else}
    <p>no pending requests, you are all caught up ٩(ˊᗜˋ*)و</p>
  {/if}
</section>
<section class="mb-8">
  <h3>my events & requests</h3>
  {#if $myEvents?.length > 0}
    {#each $myEvents as event (event.id)}
      <a href={`/app/events/${event.id}`} class="p-2 border-black border block">
        <h4>{event.name}</h4>
        <p>{event.startDate}</p>
        <p>{event.space ? event.space.name : "no space yet"}</p>
        {#if event.space}
          <div>{event.space.name} {event.space.bookingRequest?.status}</div>
        {/if}
        {#if event.resources}
          {#each event.resources as resource (resource.id)}
            <div>
              <p>{resource.name} {resource.bookingRequest?.status}</p>
            </div>
          {/each}
        {/if}
      </a>
    {/each}
  {:else}
    <p>you don't have any events yet</p>
  {/if}
</section>
<section class="mb-8">
  <h3>my spaces</h3>
  {#if $mySpaces?.length > 0}
    {#each $mySpaces as space (space.id)}
      <a
        href={`/app/spaces/${space.id}`}
        class="p-2 border-black border justify-between flex"
      >
        <p>{space.name}</p>
        {#if space.pendingBookingRequests}
          <p>pending requests ({space.pendingBookingRequests.length})</p>
        {/if}
      </a>
    {/each}
  {:else}
    <p>you don't have any spaces yet</p>
  {/if}
</section>
<section class="mb-8">
  <h3>my resources</h3>
  {#if $myResources?.length > 0}
    {#each $myResources as resource (resource.id)}
      <a
        href={`/app/resources/${resource.id}`}
        class="p-2 border-black border justify-between flex"
      >
        <p>{resource.name}</p>
        {#if resource.pendingBookingRequests}
          <p>pending requests ({resource.pendingBookingRequests.length})</p>
        {/if}
      </a>
    {/each}
  {:else}
    <p>you don't have any resources yet</p>
  {/if}
</section>
