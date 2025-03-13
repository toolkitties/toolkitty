<script lang="ts">
  let { space } = $props();

  let availability = space.availability;
  let booked = space.booked;
  let start = new Date(availability.start);
  let end = new Date(availability.end);

  function getHoursDifference(start: Date, end: Date): number {
    const diffMillis = end.getTime() - start.getTime();
    return diffMillis / (1000 * 60 * 60);
  }

  function getBookedBlocks() {
    const availabilityStart = new Date(
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

  function getHours(): string[] {
    const hours: string[] = [];
    let current = new Date(start);

    while (current < end) {
      hours.push(current.toISOString());
      current.setUTCHours(current.getUTCHours() + 1);
    }

    return hours;
  }

  const bookedBlocks = getBookedBlocks();
  const hours = getHours();
</script>

<div class="max-h-[400px] overflow-auto">
  <div class="flex">
    <ul class="divide-black-200 divide-y-2">
      {#each hours as hour, index (index)}
        <li class="h-12">{new Date(hour).getUTCHours()}:00</li>
      {/each}
    </ul>
    <div class="grow relative">
      {#each bookedBlocks as block, i (i)}
        <div
          class="bg-red-light absolute w-full"
          style="top: {block.start}%; height: {block.length}%"
        ></div>
      {/each}
    </div>
  </div>
</div>
