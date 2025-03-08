<script lang="ts">
  // booked eventually becomes prop.
  // Convert availability strings to Date objects
  let { availability } = $props();

  // for now placing data below so its easier to understand

  // const availability = {
  //   start: new Date("2025-02-10T10:00Z"),
  //   end: new Date("2025-02-10T23:00Z"),
  // };

  const booked = [
    {
      start: new Date("2025-02-10T11:00Z"),
      end: new Date("2025-02-10T12:00Z"),
    },
    {
      start: new Date("2025-02-10T13:00Z"),
      end: new Date("2025-02-10T15:00Z"),
    },
    {
      start: new Date("2025-02-10T20:30Z"),
      end: new Date("2025-02-10T22:00Z"),
    },
  ];

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

    return booked.map((booking) => {
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
    let current = availability.start;

    while (current < availability.end) {
      hours.push(current.getUTCHours().toString() + ":00");
      current.setUTCHours(current.getUTCHours() + 1);
    }

    return hours;
  }

  const bookedBlocks = getBookedBlocks();
  const hours = getHours();
</script>

<div class="max-h-[400px] overflow-auto">
  <div class="flex">
    <!-- availability as hours -->
    <ul class="divide-black-200 divide-y-2">
      {#each hours as hour}
        <li class="h-12">{hour}</li>
      {/each}
    </ul>
    <!-- bookings -->
    <div class="grow relative">
      {#each bookedBlocks as block}
        <div
          class="bg-red-light absolute w-full"
          style="top: {block.start}%; height: {block.length}%"
        ></div>
      {/each}
    </div>
  </div>
</div>
