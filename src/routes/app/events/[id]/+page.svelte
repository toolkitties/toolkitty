<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings, events } from "$lib/api";
  import { error } from "@sveltejs/kit";
  import Links from "$lib/components/Links.svelte";
  import Date from "$lib/components/Date.svelte";
  import BookingRequest from "$lib/components/BookingRequest.svelte";

  let { data }: PageProps = $props();

  let upcomingBookings: Observable<BookingRequestEnriched[]>;

  let event = liveQuery(() => {
    const e = events.findById(data.eventId);
    if (!e) {
      error(404, {
        message: "Resource not found",
      });
    }
    return e;
  });

  if (data.userRole === "admin") {
    // TODO: Perhaps adjust to account for bookings taking place right now.
    upcomingBookings = liveQuery(() =>
      bookings.findAll({
        calendarId: data.activeCalendarId,
        eventId: data.eventId,
      }),
    );
  }
</script>

{#if $event}
  <div class="space-y-4">
    <h1>{$event.name}</h1>

    <div>
      <p>
        <Date date={$event.startDate} /> - <Date date={$event.endDate} />
      </p>
      {#if $event.space}
        <a href={`#/spaces/${$event.space.id}`}>{$event.space.name}</a>
      {/if}
    </div>

    {#if (data.userRole === "admin" || data.publicKey == $event.ownerId) && $upcomingBookings?.length > 0}
      <section>
        <h3>Requests</h3>
        {#each $upcomingBookings as booking (booking.id)}
          <BookingRequest request={booking} />
        {/each}
      </section>
    {/if}

    <p>{$event.description}</p>

    <Links links={$event.links} />

    <div class="grid grid-cols-3 gap-4">
      {#each $event.images as image, index (`${image}${index}`)}
        <div class="border-2 rounded-lg border-gray-200">
          <img src={`blobstore://${image}`} alt={image} />
        </div>
      {/each}
    </div>

    {#if data.userRole == "admin"}
      <a class="button" href="#/app/events/{$event!.id}/edit">Edit</a>
    {/if}

    <pre>{JSON.stringify($event, null, 2)}</pre>
  </div>
{/if}
