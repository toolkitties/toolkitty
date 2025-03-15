<!-- Upcoming Bookings component that shown to resource/space owners when viewing a space/resource -->

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
      <a href={`/app/events/${booking.eventId}`}>
        {booking.event?.name}
        {booking.event?.startDate}
        {booking.status}
      </a>
    {/each}
  </section>
{/if}
