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
<p>{data.event.startDate}</p>
<p>{data.event.startDate}-{data.event.endDate}</p>
{#if data.event.space}
  <a href={`#/spaces/${data.event.space.id}`}>{data.event.space.name}</a>
{/if}
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
<section>
  <p>{data.event.description}</p>
  <a href={data.event.links[0].url}>{data.event.links[0].title}</a>
  <a href={data.event.links[0].url}>{data.event.links[0].title}</a>
</section>

{#if data.userRole == "admin"}
  <a class="button" href="/app/events/{data.event!.id}/edit">Edit</a>
{/if}

<pre>{JSON.stringify(data.event)}</pre>
