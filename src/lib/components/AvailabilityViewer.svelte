<script lang="ts">
  import { onMount } from "svelte";
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import { fromDate } from "@internationalized/date";
  import Bookings from "./Bookings.svelte";

  let { availability = [], multiBookable } = $props();
  let availableDays: DateValue[] = $state([]);
  let alwaysAvailable: boolean = $state(false);
  let timeAvailability: { start: Date; end: Date } | null = $state(null);

  function processAvailability() {
    availableDays = [];
    alwaysAvailable = false;

    if (!Array.isArray(availability) || availability.length === 0) {
      alwaysAvailable = true;
    } else {
      availability.forEach((timeSpan) => {
        availableDays.push(fromDate(timeSpan.start, "UTC"));
      });
    }
  }

  onMount(processAvailability);

  $effect(() => {
    processAvailability();
  });

  const isAvailableDay = (date: DateValue): boolean => {
    return availableDays.some((d) => isSameDate(d, date));
  };

  const isSameDate = (date1: DateValue, date2: DateValue): boolean => {
    return (
      date1.year === date2.year &&
      date1.month === date2.month &&
      date1.day === date2.day
    );
  };

  const handleDateSelect = (value: DateValue | DateValue[] | undefined) => {
    if (Array.isArray(value)) {
      value = value[0];
    }

    if (!value) {
      timeAvailability = null;
      return;
    }

    const selectedDate = new Date(value.year, value.month - 1, value.day);
    timeAvailability = null;

    if (Array.isArray(availability)) {
      for (let timeSpan of availability) {
        if (isSameDate(fromDate(timeSpan.start, "UTC"), value)) {
          timeAvailability = timeSpan;
          break;
        }
      }
    } else {
      console.error("Invalid availability data:", availability);
    }
  };
</script>

{#if alwaysAvailable}
  <p>Always available</p>
{:else}
  <Calendar.Root type="single" onValueChange={handleDateSelect}>
    {#snippet children({ months, weekdays })}
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
                <Calendar.HeadCell>{day}</Calendar.HeadCell>
              {/each}
            </Calendar.GridRow>
          </Calendar.GridHead>
          <Calendar.GridBody>
            {#each month.weeks as weekDates}
              <Calendar.GridRow>
                {#each weekDates as date}
                  <Calendar.Cell {date} month={month.value}>
                    <Calendar.Day
                      class={`data-[outside-month]:pointer-events-none
                            data-[outside-month]:text-gray-300
                            data-[selected]:bg-black
                            data-[selected]:text-white
                            ${isAvailableDay(date) ? "bg-green-300" : ""}
                            ${!isAvailableDay(date) ? "text-gray-400 pointer-events-none" : ""}`}
                      aria-disabled={!isAvailableDay(date) ? "true" : undefined}
                    />
                  </Calendar.Cell>
                {/each}
              </Calendar.GridRow>
            {/each}
          </Calendar.GridBody>
        </Calendar.Grid>
      {/each}
    {/snippet}
  </Calendar.Root>

  {#if multiBookable}
    <p>This space can have multiple bookings at the same time.</p>
  {/if}

  {#if timeAvailability}
    <Bookings availability={timeAvailability} />
  {/if}
{/if}
