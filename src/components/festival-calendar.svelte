<script lang="ts">
  import { Calendar } from "bits-ui";
  import { CalendarDate } from "@internationalized/date";
  import type { DateValue } from "@internationalized/date";

  let {
    canSelectMultiple,
    festivalDates = null,
    eventsCount = null,
  } = $props();

  // Generate an array of all festival dates
  const generateFestivalDates = (): DateValue[] => {
    if (!festivalDates) return [];

    const { startCalendarDate, endCalendarDate } = festivalDates;

    let startDate = new CalendarDate(
      startCalendarDate.year,
      startCalendarDate.month,
      startCalendarDate.day,
    );
    let endDate = new CalendarDate(
      endCalendarDate.year,
      endCalendarDate.month,
      endCalendarDate.day,
    );

    let dates: DateValue[] = [];
    let currentDate = startDate;

    while (currentDate.compare(endDate) <= 0) {
      dates.push(
        new CalendarDate(currentDate.year, currentDate.month, currentDate.day),
      );
      currentDate = currentDate.add({ days: 1 });
    }

    return dates;
  };

  const festivalDateArray = generateFestivalDates();

  // Highlight festival dates
  const isFestivalDate = (date: DateValue): boolean => {
    return festivalDateArray.some((festivalDate) =>
      isSameDate(festivalDate, date),
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

  // Busy-ness indicator on highlighted dates
  const getOpacity = (date: DateValue): number => {
    if (!eventsCount || !Array.isArray(eventsCount)) {
      return 1;
    }
    const eventForDate = eventsCount.find((event) =>
      isSameDate(event.date, date),
    );
    if (eventForDate) {
      return Math.min(0.2 + eventForDate.numberOfEvents * 0.2, 1);
    }
    return 0.1;
  };
</script>

<Calendar.Root let:months let:weekdays multiple={canSelectMultiple}>
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
                  style={`opacity: ${getOpacity(date)}`}
                  class={`data-[outside-month]:pointer-events-none
                    data-[outside-month]:text-gray-300
                    data-[selected]:bg-black
                    data-[selected]:text-white
                    ${!isFestivalDate(date) ? "text-gray-400 pointer-events-none" : ""}
                    ${isFestivalDate(date) ? "bg-black text-white font-bold" : ""}`}
                />
              </Calendar.Cell>
            {/each}
          </Calendar.GridRow>
        {/each}
      </Calendar.GridBody>
    </Calendar.Grid>
  {/each}
</Calendar.Root>
