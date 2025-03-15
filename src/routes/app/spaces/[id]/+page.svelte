<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";

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

<h1>{data.space.name}</h1>
{#if amOwner}
  <UpcomingBookings {upcomingBookings} />
{/if}
<p>{data.space.description}</p>
<p>Accessibility Information: {data.space.accessibility}</p>
<p>Capacity: {data.space.capacity}</p>
<AvailabilityViewer data={data.space} />
<pre>{JSON.stringify(data.space)}</pre>
{#if data.userRole == "admin"}
  <a class="button" href="/app/spaces/{data.space!.id}/edit">Edit</a>
{/if}
