<script lang="ts">
  let { availability, space } = $props();

  let booked = space.booked;

  /**
   * Calculate the difference in hours between two dates
   * */
  function getHoursDifference(start: Date, end: Date): number {
    const diffMillis = end.getTime() - start.getTime();
    return diffMillis / (1000 * 60 * 60); // Convert milliseconds to hours
  }

  /**
   * Convert booked TimeSpan into slots that are a percentage
   * of the total availability for the day, this allows us to
   * then display them as absolutely positioned elements with
   * start being % from top and length being % height.
   */
  function getBookedBlocks() {
    const availabilityStart = new Date(
      availability.start.year,
      availability.start.month - 1, // JS months are 0-based
      availability.start.day,
      availability.start.hour,
      availability.start.minute,
    );

    const availabilityEnd = new Date(
      availability.end.year,
      availability.end.month - 1,
      availability.end.day,
      availability.end.hour,
      availability.end.minute,
    );

    const availabilityLength = getHoursDifference(
      availabilityStart,
      availabilityEnd,
    );

    return booked.map((booking: { start: Date; end: Date }) => {
      const start =
        (getHoursDifference(availabilityStart, booking.start) /
          availabilityLength) *
        100;
      const length =
        (getHoursDifference(booking.start, booking.end) / availabilityLength) *
        100;

      return { start, length };
    });
  }
  /**
   * Get the availability split into hours
   */
  function getHours(): string[] {
    const hours: string[] = [];
    let current = new Date(
      availability.start.year,
      availability.start.month - 1,
      availability.start.day,
      availability.start.hour,
      availability.start.minute,
    );

    const availabilityEnd = new Date(
      availability.end.year,
      availability.end.month - 1,
      availability.end.day,
      availability.end.hour,
      availability.end.minute,
    );

    while (current < availabilityEnd) {
      hours.push(current.getUTCHours().toString() + ":00");
      current.setUTCHours(current.getUTCHours() + 1);
    }

    return hours;
  }

  const bookedBlocks = getBookedBlocks();
  const hours = getHours();
</script>

<p>
  {space.name} is available between {availability.start} and {availability.end}
</p>
{#if bookedBlocks.length === 0}
  <p>No bookings yet.</p>
{:else}
  <div class="max-h-[400px] overflow-auto">
    <div class="flex">
      <!-- availability as hours -->
      <ul class="divide-black-200 divide-y-2">
        {#each hours as hour (hour)}
          <li class="h-12">{hour}</li>
        {/each}
      </ul>
      <!-- bookings -->
      <div class="grow relative">
        {#each bookedBlocks as block (block.start)}
          <div
            class="bg-red-light absolute w-full"
            style="top: {block.start}%; height: {block.length}%"
          ></div>
        {/each}
      </div>
    </div>
  </div>
{/if}
