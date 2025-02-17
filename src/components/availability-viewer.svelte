<script lang="ts">
  import { onMount } from "svelte";
  import { Calendar } from "bits-ui";
  import TimeAvailability from "./time-availability.svelte";
  import { fromDate } from "@internationalized/date";
  import type { DateValue } from "@internationalized/date";
  import { findById as findSpaceById } from "$lib/api/spaces";
  import { findById as findResourceById } from "$lib/api/resources";

  let { resourceId, type } = $props();
  let availableDays: DateValue[] = [];
  let resource: Resource | Space;
  let alwaysAvailble: boolean = $state(false);

  onMount(async () => {
    try {
      if (type === "space") {
        resource = await findSpaceById(resourceId);
      } else if (type === "resource") {
        resource = await findResourceById(resourceId);
      }

      const availability = resource.availability;

      if (availability === "always") {
        alwaysAvailble = true;
        return;
      } else {
        availability.forEach((span) => {
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          let day: DateValue = fromDate(span.start, timeZone);
          availableDays.push(day);
        });
      }
    } catch (error) {
      console.log("Error fetching space availability: ", error);
    }
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

  let timeAvailability: TimeSpan | null = $state(null);

  const handleDateSelect = (value: DateValue | DateValue[] | undefined) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value = value[0];
    }

    if ("year" in value && "month" in value && "day" in value) {
      const selectedDate = new Date(value.year, value.month - 1, value.day);

      if (resource.availability !== "always") {
        for (let span of resource.availability) {
          const availabilityDate = new Date(span.start);

          if (
            availabilityDate.getFullYear() === selectedDate.getFullYear() &&
            availabilityDate.getMonth() === selectedDate.getMonth() &&
            availabilityDate.getDate() === selectedDate.getDate()
          ) {
            timeAvailability = span;
          }
        }
      }
      timeAvailability = null;
    } else {
      console.error("Invalid DateValue format received:", value);
    }
  };
</script>

{#if alwaysAvailble}
  <p>Always available</p>
{:else}
  <Calendar.Root let:months let:weekdays onValueChange={handleDateSelect}>
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

  {#if timeAvailability}
    <TimeAvailability availability={timeAvailability} />
  {/if}
{/if}
