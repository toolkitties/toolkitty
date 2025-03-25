<script lang="ts">
  import { Calendar } from "bits-ui";
  import {
    parseAbsoluteToLocal,
    today,
    getLocalTimeZone,
  } from "@internationalized/date";
  import type { DateValue } from "@internationalized/date";
  // import { createDatesArray } from "$lib/utils/createDatesArray";

  let {
    startDate,
    endDate,
    eventsByDate,
  }: {
    startDate: string;
    endDate: string;
    eventsByDate: {
      date: string;
      eventsList: CalendarEventEnriched[];
    }[];
  } = $props();

  const parsedStartDate = parseAbsoluteToLocal(startDate);
  const parsedEndDate = parseAbsoluteToLocal(endDate);

  let value = $state(today(getLocalTimeZone()));

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
  <Calendar.Root
    type="single"
    minValue={parseAbsoluteToLocal($calendar.startDate)}
    maxValue={parseAbsoluteToLocal($calendar.endDate)}
    bind:value
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
                <Calendar.HeadCell>
                  {day}
                </Calendar.HeadCell>
              {/each}
            </Calendar.GridRow>
          </Calendar.GridHead>
          <Calendar.GridBody>
            {#each month.weeks as weekDates, weekIndex (weekIndex)}
              <Calendar.GridRow>
                {#each weekDates as date (date)}
                  <Calendar.Cell {date} month={month.value}>
                    <Calendar.Day
                      class={`data-[outside-month]:pointer-events-none
                      data-[outside-month]:text-gray-300
                      data-[selected]:bg-black
                      data-[selected]:text-white
                      data-[disabled]:opacity-50
                      `}
                    >
                      {date.day}
                      <div
                        class="bg-foreground group-data-selected:bg-background group-data-today:block absolute top-[5px] hidden size-1 rounded-full"
                      ></div>
                    </Calendar.Day>
                  </Calendar.Cell>
                {/each}
              </Calendar.GridRow>
            {/each}
          </Calendar.GridBody>
        </Calendar.Grid>
      {/each}
    {/snippet}
  </Calendar.Root>
</script>
