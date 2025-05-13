<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings, events } from "$lib/api";
  import { error } from "@sveltejs/kit";
  import Links from "$lib/components/Links.svelte";
  import DateRange from "$lib/components/DateRange.svelte";
  import BookingRequest from "$lib/components/BookingRequest.svelte";
  import ImageGallery from "$lib/components/ImageGallery.svelte";

  let { data }: PageProps = $props();
  let upcomingBookings: Observable<BookingRequestEnriched[]>;
  let amOwner = $state(false);

  let event = liveQuery(() => {
    const event = events.findById(data.eventId);
    if (!event) {
      error(404, {
        message: "Resource not found",
      });
    }
    return event;
  });

  // TODO: use $derived.by instead of $effect here.
  $effect(() => {
    if ($event) {
      amOwner = $event.ownerId === data.publicKey;
      if (amOwner) {
        // TODO: Perhaps adjust to account for bookings taking place right now.
        upcomingBookings = liveQuery(() =>
          bookings.findAll({
            calendarId: data.activeCalendarId,
            eventId: data.eventId,
          }),
        );
      }
    }
  });
</script>

{#if $event}
  <div class="space-y-4">
    <h1>{$event.name}</h1>

    <div>
      <p>
        <DateRange startDate={$event.startDate} endDate={$event.endDate} />
      </p>
      {#if $event.space}
        <a href={`/spaces/view?id=${$event.space.id}`}>{$event.space.name}</a>
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

    <ImageGallery images={$event.images} />

    {#if data.userRole == "admin" || amOwner}
      <a class="button-edit button" href="/app/events/edit?id={$event!.id}"
        ><span>edit</span></a
      >
    {/if}

    <pre>{JSON.stringify($event, null, 2)}</pre>
  </div>
{/if}
