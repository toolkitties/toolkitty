<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import { fromDate } from "@internationalized/date";
  import { spaces } from "$lib/api";
  import Bookings from "./Bookings.svelte";
  import { TimeSpanClass } from "$lib/timeSpan";

  let {
    data,
    selected,
    type,
  }: {
    data: Space | Resource;
    selected?: string;
    onChange?: () => void;
    type: string;
  } = $props();
  let availability: TimeSpan[] = $derived(data.availability) as TimeSpan[];
  let availabilityByDay: TimeSpan | null = $state(null);
  let selectedDate = selected? fromDate(new Date(selected), 'UTC'): undefined;
  let currentlySelectedDate: DateValue | undefined  = $state(selectedDate);
  let booked: BookingRequest[] = $state([]);
  let loading: boolean = $state(true);

  const handleDateSelect = async (
    value: DateValue | DateValue[] | undefined,
  ) => {
    if (!value) {
      availabilityByDay = null;
      booked = [];
      return;
    }
    if (Array.isArray(value)) {
      value = value[0];
    }

    if (!value) {
      availabilityByDay = null;
      booked = [];
      return;
    }

    loading = true;
    availabilityByDay = null;

    for (let timeSpan of availability) {
      let timeSpanStartDateValue = fromDate(new Date(timeSpan.start), "UTC");
      if (isSameDate(timeSpanStartDateValue, value)) {
        availabilityByDay = { start: timeSpan.start, end: timeSpan.end };

        booked = await spaces.findBookings(
          data.id,
          new TimeSpanClass(availabilityByDay),
        );

        loading = false;
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

  // Trigger a "dateSelect" event so that the initial UI shows availability.
  handleDateSelect(selectedDate);
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
{#if currentlySelectedDate && !loading}
  <Bookings availability={availabilityByDay} {data} {booked} />
{/if}
{#if data.multiBookable}
  <p>
    This {#if type == "space"}space{/if}
    {#if type == "resource"}resource{/if} can have multiple bookings at the same
    time.
  </p>
{/if}
