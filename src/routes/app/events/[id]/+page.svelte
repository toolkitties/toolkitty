<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings } from "$lib/api";

  let { data }: PageProps = $props();

  let upcomingBookings: Observable<BookingRequestEnriched[]>;

  if (data.userRole === "admin") {
    // TODO: Perhaps adjust to account for bookings taking place right now.
    upcomingBookings = liveQuery(() =>
      bookings.findAll({
        calendarId: data.activeCalendarId,
        eventId: data.event.id,
      }),
    );
  }
</script>

<h1>{data.event.name}</h1>
{#if data.userRole === "admin" && $upcomingBookings?.length > 0}
  <section>
    <h3>Requests</h3>
    {#each $upcomingBookings as booking (booking.id)}
      <div
        class="border border-black p-2 flex justify-between w-full text-left"
      >
        <span
          >{booking.resource?.name
            ? booking.resource?.name
            : "No name yet"}</span
        >
        <span>{booking.status}</span>
      </div>
    {/each}
  </section>
{/if}
<pre>{JSON.stringify(data.event)}</pre>
{#if data.userRole == "admin"}
  <a href="#/app/events/{data.event!.id}/edit">Edit</a>
{/if}
