<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import { bookings } from "$lib/api";

  let { data }: PageProps = $props();

  let now = new Date();

  // TODO: Perhaps adjust to account for bookings taking place right now.
  let upcomingBookings = liveQuery(() =>
    bookings.findAll({
      calendarId: data.activeCalendarId,
      resourceId: data.resource.id,
      from: now,
    }),
  );
</script>

<h1>{data.resource.name}</h1>
<section>
  <h3>Upcoming bookings</h3>
  {#if $upcomingBookings?.length > 0}
    {#each $upcomingBookings as booking (booking.id)}
      <a href={`/app/events/${booking.eventId}`}>
        {booking.event?.name}
        {booking.event?.startDate}
        {booking.status}
      </a>
    {/each}
  {/if}
</section>
<pre>{JSON.stringify(data.resource)}</pre>
{#if data.userRole == "admin"}
  <a href="/app/resources/{data.resource!.id}/edit">Edit</a>
{/if}
