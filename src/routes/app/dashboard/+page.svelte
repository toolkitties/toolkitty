<script lang="ts">
  import type { PageProps } from "./$types";
  import RequestDialog from "./RequestDialog.svelte";
  import { bookings, events, resources, spaces } from "$lib/api";
  import { liveQuery } from "dexie";
  import PlusIcon from "$lib/components/icons/plusIcon.svelte";
  import DateRange from "$lib/components/DateRange.svelte";

  let { data }: PageProps = $props();

  let myPendingRequests = liveQuery(() =>
    bookings.findAll({
      calendarId: data.activeCalendarId,
      status: "pending",
      resourceOwner: data.publicKey,
    }),
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
  {#if $myPendingRequests?.length > 0}
    {#each $myPendingRequests as request (request.id)}
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
      <a
        href={`/app/events/view?id=${event.id}`}
        class="p-2 border-black border block"
      >
        <h4>{event.name}</h4>
        <DateRange startDate={event.startDate} endDate={event.endDate} />
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
    <a
      href="/app/events/create"
      class="rounded-full border-black border p-2 inline-block"
    >
      <PlusIcon size={10} />
      <span class="sr-only">Add event</span>
    </a>
  {:else}
    <p>you don't have any events yet</p>
  {/if}
</section>
<section class="mb-8">
  <h3>my spaces</h3>
  {#if $mySpaces?.length > 0}
    {#each $mySpaces as space (space.id)}
      <a
        href={`/app/spaces/view?id=${space.id}`}
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
  <a
    href="/app/spaces/create"
    class="rounded-full border-black border p-2 inline-block"
  >
    <PlusIcon size={10} />
    <span class="sr-only">Add event</span>
  </a>
</section>
<section class="mb-8">
  <h3>my resources</h3>
  {#if $myResources?.length > 0}
    {#each $myResources as resource (resource.id)}
      <a
        href={`/app/resources/view?id=${resource.id}`}
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
  <a
    href="/app/resources/create"
    class="rounded-full border-black border p-2 inline-block"
  >
    <PlusIcon size={10} />
    <span class="sr-only">Add event</span>
  </a>
</section>
