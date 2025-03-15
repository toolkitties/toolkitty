<!--
  Upcoming Bookings component 
  displayed to resource/space owners when viewing a space/resource
-->

<script lang="ts">
  import type { Observable } from "dexie";

  let {
    upcomingBookings,
  }: { upcomingBookings: Observable<BookingRequestEnriched[]> } = $props();
</script>

{#if $upcomingBookings?.length > 0}
  <section>
    <h3>Upcoming bookings</h3>
    {#each $upcomingBookings as booking (booking.id)}
      <a
        href={`/app/events/${booking.eventId}`}
        class="block border border-black p-2 w-full text-left"
      >
        <p>{booking.event?.name}</p>
        <p>{booking.event?.startDate}</p>
        <p>{booking.status}</p>
      </a>
    {/each}
  </section>
{/if}
