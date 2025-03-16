<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings } from "$lib/api";
  import Links from "$lib/components/Links.svelte";
  import Date from "$lib/components/Date.svelte";

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

<div class="space-y-4">
  <h1>{data.event.name}</h1>

  <div>
    <p>
      <Date date={data.event.startDate} /> - <Date date={data.event.endDate} />
    </p>
    {#if data.event.space}
      <a href={`#/spaces/${data.event.space.id}`}>{data.event.space.name}</a>
    {/if}
  </div>

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

  <Links links={data.event.links} />

  {#if data.userRole == "admin"}
    <a class="button" href="#/app/events/{data.event!.id}/edit">Edit</a>
  {/if}

  <pre>{JSON.stringify(data.event, null, 2)}</pre>
</div>
