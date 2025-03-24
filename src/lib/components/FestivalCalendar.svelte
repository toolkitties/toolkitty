<script lang="ts">
  import { Calendar } from "bits-ui";
  import { parseDate } from "@internationalized/date";
  import type { DateValue } from "@internationalized/date";
  // import { createDatesArray } from "$lib/utils/createDatesArray";

  let {
    startDate,
    endDate,
    // events,
  }: {
    startDate: string;
    endDate: string;
    // events: CalendarEventEnriched[];
  } = $props();

  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate);

  // const isFestivalDate = (date: DateValue): boolean => {
  //   return festivalDateArray.some((festivalDate) =>
  //     isSameDate(festivalDate, date),
  //   );
  // };

  // const isSameDate = (date1: DateValue, date2: DateValue): boolean => {
  //   return (
  //     date1.calendar.identifier === date2.calendar.identifier &&
  //     date1.year === date2.year &&
  //     date1.month === date2.month &&
  //     date1.day === date2.day
  //   );
  // };

  /*
    @TODO - figure out how to manage this if events can span across multiple days
  */
  //Busy-ness indicator on highlighted dates
  // const getOpacity = (date: DateValue): number => {
  //   if (!eventsCount || !Array.isArray(eventsCount)) {
  //     return 1;
  //   }
  //   const eventForDate = eventsCount.find((event) =>
  //     isSameDate(event.date, date),
  //   );
  //   if (eventForDate) {
  //     return Math.min(0.2 + eventForDate.numberOfEvents * 0.2, 1);
  //   }
  //   return 0.1;
  // };
</script>

<Calendar.Root
  type="single"
  minValue={parsedStartDate}
  maxValue={parsedEndDate}
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
            {#each weekdays as day (day)}
              <Calendar.HeadCell>
                {day}
              </Calendar.HeadCell>
            {/each}
          </Calendar.GridRow>
        </Calendar.GridHead>
        <Calendar.GridBody>
          {#each month.weeks as weekDates, i (i)}
            <Calendar.GridRow>
              {#each weekDates as date (date)}
                <Calendar.Cell {date} month={month.value}>
                  <Calendar.Day
                    class={`data-[outside-month]:pointer-events-none
                      data-[outside-month]:text-gray-300
                      data-[selected]:bg-black
                      data-[selected]:text-white
                      `}
                    aria-disabled={!isFestivalDate(date) ? "true" : undefined}
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
