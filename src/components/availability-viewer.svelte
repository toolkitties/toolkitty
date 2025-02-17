<script lang="ts">
  import { onMount } from "svelte";
  import { Calendar } from "bits-ui";
  import TimeAvailability from "./time-availability.svelte";
  import type { DateValue } from "@internationalized/date";
  import { findById as findSpaceById } from "$lib/api/spaces";
  import { findById as findResourceById } from "$lib/api/resources";
  import { createDatesArray } from "$lib/utils/createDatesArray";

  let { resourceId, type } = $props();
  let availability: TimeSpan[];
  let availableDays: DateValue[] = [];

  let resource: Resource | Space;

  onMount(async () => {
    try {
      if (type === "space") {
        resource = await findSpaceById(resourceId);
      } else if (type === "resource") {
        resource = await findResourceById(resourceId);
      }

      const availability = resource.availability;

      if (availability === "always") {
        // not sure yet
        return;
      } else {
        availability.forEach((entry) => {
          let availabilityDateArray: DateValue[] = createDatesArray(entry);
          availabilities.push(availabilityDateArray);
        });
      }
    } catch (error) {
      console.log("Error fetching space availability: ", error);
    }

    availabilities.forEach((span) => {
      span.forEach((day) => {
        availableDays.push(day);
      });
    });
  });

  // Highlight available days
  const isAvailableDay = (date: DateValue): boolean => {
    return (
      availableDays && availableDays.some((d: DateValue) => isSameDate(d, date))
    );
  };

  const isSameDate = (date1: DateValue, date2: DateValue): boolean => {
    return (
      date1.calendar.identifier === date2.calendar.identifier &&
      date1.year === date2.year &&
      date1.month === date2.month &&
      date1.day === date2.day
    );
  };

  // the availability of the selected resource on the selected day
  let availability: TimeSpan = {}

</script>

<Calendar.Root let:months let:weekdays>
  <Calendar.Header class="flex flex-row">
    <Calendar.PrevButton class="w-8 mr-2">←</Calendar.PrevButton>
    <Calendar.Heading />
    <Calendar.NextButton class="w-8 ml-2">→</Calendar.NextButton>
  </Calendar.Header>

  {#each months as month}
    <Calendar.Grid>
      <Calendar.GridHead>
        <Calendar.GridRow>
          {#each weekdays as day}
            <Calendar.HeadCell>
              {day}
            </Calendar.HeadCell>
          {/each}
        </Calendar.GridRow>
      </Calendar.GridHead>
      <Calendar.GridBody>
        {#each month.weeks as weekDates}
          <Calendar.GridRow>
            {#each weekDates as date}
              <Calendar.Cell {date}>
                <Calendar.Day
                  {date}
                  month={month.value}
                  class={`data-[outside-month]:pointer-events-none
                                          data-[outside-month]:text-gray-300
                                          data-[selected]:bg-black
                                          data-[selected]:text-white
                                          ${isAvailableDay(date) ? "bg-green-300" : ""}
                                          ${!isAvailableDay(date) ? "text-gray-400 pointer-events-none" : ""}`}
                />
              </Calendar.Cell>
            {/each}
          </Calendar.GridRow>
        {/each}
      </Calendar.GridBody>
    </Calendar.Grid>
  {/each}
</Calendar.Root>

</TimeAvailability availability={}>
