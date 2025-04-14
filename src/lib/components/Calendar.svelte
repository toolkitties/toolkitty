<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { CalendarRootProps } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import { fromDate } from "@internationalized/date";

  type extendedCalendarRootProps = CalendarRootProps & {
    // busyness?: {
    //   date: string;
    //   eventsList: CalendarEventEnriched[];
    // }[];
    availability?: TimeSpan[];
  };

  let {
    type,
    minValue,
    maxValue,
    value = $bindable(),
    onValueChange,
    // busyness,
    availability,
  }: extendedCalendarRootProps = $props();

  // Set minValue and maxValue based on availability
  if (availability && availability.length > 0) {
    const sortedAvailability = availability
      .map(({ start }) => fromDate(new Date(start), "UTC"))
      .sort((a, b) => a.compare(b));

    minValue = sortedAvailability[0]; // Earliest available date
    maxValue = sortedAvailability[sortedAvailability.length - 1]; // Latest available date
  }

  /**
   * Busy-ness indicator on highlighted dates
   * Return a opacity value between 0 and 100.
   * 0 = no events
   * 100 = 5 or more events.
   */
  // function getBusynessOpacity(date: DateValue): number {
  //   if (!busyness) {
  //     return 0;
  //   }

  //   const groupForDate = busyness.find(
  //     (group) => group.date === date.toString(),
  //   );

  //   if (!groupForDate) {
  //     return 0;
  //   }

  //   const eventCount = Math.min(groupForDate.eventsList.length, 5);
  //   return (eventCount / 5) * 100;
  // }

  // Disable dates based on availability prop
  function isDateDisabled(date: DateValue) {
    if (!availability) return false;
    return !availability.some(({ start }) => {
      const availableDate: DateValue = fromDate(new Date(start), "UTC"); //@TODO - think about how to properly handle timezone
      return date.compare(availableDate) === 0;
    });
  }
</script>

<Calendar.Root
  {isDateDisabled}
  {type}
  {minValue}
  {maxValue}
  bind:value
  {onValueChange}
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
                    class={`border-black border
                      rounded data-outside-month:pointer-events-none
                      data-outside-month:text-gray-300
                      data-selected:bg-black
                      data-selected:text-white
                      cursor-pointer
                      data-disabled:cursor-not-allowed
                      data-disabled:opacity-50
                      data-disabled:border-0`}
                  >
                    {date.day}
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
