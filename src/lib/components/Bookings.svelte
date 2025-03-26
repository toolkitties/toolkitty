<!-- 
 @component
 Display bookings in a nice UX.
  -->

<script lang="ts">
  let {
    availability,
    data,
    booked,
  }: {
    availability: TimeSpan | null;
    data: Space | Resource;
    booked: BookingRequestEnriched[];
  } = $props();

  const bookedBlocks = $derived.by(getBookedBlocks);
  const hours = $derived.by(getHours);

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
    const availabilityStart = new Date(availability!.start);
    const availabilityEnd = new Date(availability!.end!);

    const availabilityLength = getHoursDifference(
      availabilityStart,
      availabilityEnd,
    );

    return booked.map((booking) => {
      const bookingStartDate = new Date(booking.timeSpan.start);
      const bookingEndDate = new Date(booking.timeSpan.end!);
      const start =
        (getHoursDifference(availabilityStart, bookingStartDate) /
          availabilityLength) *
        100;
      const length =
        (getHoursDifference(bookingStartDate, bookingEndDate) /
          availabilityLength) *
        100;

      return { start, length };
    });
  }
  /**
   * Get the availability split into hours
   */
  function getHours(): string[] {
    const hours: string[] = [];
    const current = new Date(availability!.start);
    const availabilityEnd = new Date(availability!.end!);

    while (current < availabilityEnd) {
      hours.push(current.getUTCHours().toString() + ":00");
      current.setUTCHours(current.getUTCHours() + 1);
    }

    return hours;
  }
</script>

{#if bookedBlocks.length === 0}
  <p>
    No bookings yet, {data.name} is available between {availability?.start.slice(
      11,
      16,
    )} and {availability?.end?.slice(11, 16)}
  </p>
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
