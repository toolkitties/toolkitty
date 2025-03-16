<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import Links from "$lib/components/Links.svelte";

  let { data }: PageProps = $props();

  let now = new Date();
  // TODO: look into if this should be declared with `$state(...)` as errors says.
  let upcomingBookings: Observable<BookingRequestEnriched[]>;
  let amOwner = data.space.ownerId === data.publicKey;

  if (amOwner) {
    // TODO: Perhaps adjust to account for bookings taking place right now.
    upcomingBookings = liveQuery(() =>
      bookings.findAll({
        calendarId: data.activeCalendarId,
        resourceId: data.space.id,
        from: now,
      }),
    );
  }
</script>


<div class="space-y-4">
  <h1>{data.space.name}</h1>

  {#if amOwner}
    <UpcomingBookings {upcomingBookings} />
  {/if}

  <div>
    {#if data.space.location.type === "physical"}
      <p>
        {#if data.space.location.street}{data.space.location.street}{/if}
        {#if data.space.location.city}, {data.space.location.city}{/if}
        {#if data.space.location.state}, {data.space.location.state}{/if}
        {#if data.space.location.zip}, {data.space.location.zip}{/if}
        {#if data.space.location.country}, {data.space.location.country}{/if}
      </p>
    {:else if data.space.location.type === "gps"}
      <p>{data.space.location.lat}, {data.space.location.lon}</p>
    {:else}
      <p>{data.space.location.link}</p>
    {/if}
  </div>

  {#if data.space.link}
    <Links links={[data.space.link]} />
  {/if}

  <p>{data.space.description}</p>

  <div>
    <p>Accessibility Information: {data.space.accessibility}</p>
    <p>Capacity: {data.space.capacity}</p>
  </div>

  <AvailabilityViewer data={data.space} />

  {#if data.userRole == "admin"}
    <a class="button" href="/app/spaces/{data.space!.id}/edit">Edit</a>
  {/if}

  <pre>{JSON.stringify(data.space, null, 2)}</pre>
</div>
