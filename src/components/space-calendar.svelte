<script lang="ts">
  import { onMount } from "svelte";
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import TimePicker from "./time-picker.svelte";
  import { findById } from "$lib/api/spaces";
  import { createDatesArray } from "$lib/utils/createDatesArray";

  let { spaceId } = $props();
  let availabilities: DateValue[][] = [];
  let availableDays: DateValue[] = [];

  onMount(async () => {
    try {
      const space = await findById(spaceId);
      const availability = space.availability;

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

<!-- @TODO - figure out how to parse oout available timeslots from available days -->
<!-- {#if selectedDate}
    <TimePicker {selectedDate} availableTimeSlots={timeslots} />
  {/if} -->
