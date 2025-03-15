<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";

  let { data }: PageProps = $props();

  let now = new Date();
  let upcomingBookings: Observable<BookingRequestEnriched[]>;
  let amOwner = data.resource.ownerId === data.publicKey;

  if (amOwner) {
    // TODO: Perhaps adjust to account for bookings taking place right now.
    upcomingBookings = liveQuery(() =>
      bookings.findAll({
        calendarId: data.activeCalendarId,
        resourceId: data.resource.id,
        from: now,
      }),
    );
  }
</script>

<h1>{data.resource.name}</h1>
{#if amOwner}
  <UpcomingBookings {upcomingBookings} />
{/if}
<pre>{JSON.stringify(data.resource)}</pre>
{#if data.userRole == "admin"}
  <a href="/app/resources/{data.resource!.id}/edit">Edit</a>
{/if}
