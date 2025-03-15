<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import { fromDate } from "@internationalized/date";
  import { spaces } from "$lib/api";
  import Bookings from "./Bookings.svelte";
  import { TimeSpanClass } from "$lib/timeSpan";

  let { space }: { space: Space } = $props();
  let availability: TimeSpan[] = $derived(space.availability) as TimeSpan[];
  let availabilityByDay: TimeSpan | null = $state(null);
  let currentlySelectedDate: DateValue | undefined = $state(undefined);
  let booked: BookingRequest[] = $state([]); // Store bookings

  const handleDateSelect = async (
    value: DateValue | DateValue[] | undefined,
  ) => {
    if (Array.isArray(value)) {
      value = value[0];
    }

    if (!value) {
      availabilityByDay = null;
      booked = [];
      return;
    }

    availabilityByDay = null;

    for (let timeSpan of availability) {
      let timeSpanStartDateValue = fromDate(new Date(timeSpan.start), "UTC");
      if (isSameDate(timeSpanStartDateValue, value)) {
        availabilityByDay = { start: timeSpan.start, end: timeSpan.end };

        booked = await spaces.findBookings(
          space.id,
          new TimeSpanClass(availabilityByDay),
        );
        break;
      }
    }
  };

  const isSameDate = (date1: DateValue, date2: DateValue): boolean => {
    return (
      date1.year === date2.year &&
      date1.month === date2.month &&
      date1.day === date2.day
    );
  };

  function isAvailableDay(date: DateValue) {
    return availability.some(({ start }) => {
      const availableDate: DateValue = fromDate(new Date(start), "UTC"); //@TODO - think about how to properly handle timezone
      return date.compare(availableDate) === 0;
    });
  }
</script>

<!-- TODO: Refactor Calendar into one component as we are using in a few places now -->
<Calendar.Root
  type="single"
  bind:value={currentlySelectedDate}
  onValueChange={handleDateSelect}
>
  {#snippet children({ months, weekdays })}
    <Calendar.Header class="flex flex-row">
      <Calendar.PrevButton class="w-8 mr-2">←</Calendar.PrevButton>
      <Calendar.Heading />
      <Calendar.NextButton class="w-8 ml-2">→</Calendar.NextButton>
    </Calendar.Header>
    {#each months as month (month.value)}
      <Calendar.Grid>
        <Calendar.GridHead>
          <Calendar.GridRow>
            {#each weekdays as day, index (index)}
              <Calendar.HeadCell>{day}</Calendar.HeadCell>
            {/each}
          </Calendar.GridRow>
        </Calendar.GridHead>
        <Calendar.GridBody>
          {#each month.weeks as weekDates, weekIndex (weekIndex)}
            <Calendar.GridRow>
              {#each weekDates as date (date.toString())}
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
{#if currentlySelectedDate}
  <Bookings availability={availabilityByDay} {space} {booked} />
{/if}
{#if space.multiBookable}
  <p>This space can have multiple bookings at the same time.</p>
{/if}
