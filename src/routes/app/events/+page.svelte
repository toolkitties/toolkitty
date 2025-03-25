<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";
  import { liveQuery } from "dexie";
  import { calendars, events } from "$lib/api";
  import PageText from "$lib/components/PageText.svelte";
  import Contribute from "$lib/components/Contribute.svelte";
  import Date from "$lib/components/Date.svelte";
  import { Calendar } from "bits-ui";
  import { parseAbsoluteToLocal } from "@internationalized/date";
  import type { CalendarDate, DateValue } from "@internationalized/date";

  let { data }: PageProps = $props();
  let value: CalendarDate | undefined = $state();

  function getDay(event: CalendarEventEnriched): string {
    return event.startDate.split("T")[0];
  }

  /**
   * Group events by date like that:
   *
   * ```
   * [
   *    {
   *       date: "YYYY-MM-DD",
   *       eventsList: [...],
   *    }, ...
   * ]
   * ```
   */
  let eventsByDate = liveQuery(async () => {
    const activeCalendarId = await calendars.getActiveCalendarId();
    if (!activeCalendarId) return [];
    const allEvents = await events.findMany(activeCalendarId);
    if (allEvents.length === 0) {
      return [];
    }

    const result = [];

    let currentDate = getDay(allEvents[0]);
    let currentEventsList = [];

    for (const event of allEvents) {
      const startDay = getDay(event);

      if (startDay !== currentDate) {
        result.push({
          date: currentDate,
          eventsList: currentEventsList,
        });

        currentDate = startDay;
        currentEventsList = [];
      }

      currentEventsList.push(event);
    }

    result.push({
      date: currentDate,
      eventsList: currentEventsList,
    });

    return result;
  });

  let calendar = liveQuery(async () => {
    const activeCalendarId = await calendars.getActiveCalendarId();
    if (!activeCalendarId) return undefined;
    const calendar = await calendars.findById(activeCalendarId);
    return calendar;
  });

  /**
   * Filter events by selected calendar date
   */
  let filteredEvents = $derived.by(() => {
    if (!value) {
      return $eventsByDate;
    }

    return $eventsByDate.filter((group) => group.date === value.toString());
  });

  /**
   * Busy-ness indicator on highlighted dates
   * Return a opacity value between 0 and 100.
   * 0 = no events
   * 100 = 5 or more events.
   */
  function getBusynessOpacity(date: DateValue): number {
    if (!$eventsByDate) {
      return 0;
    }

    const groupForDate = $eventsByDate.find(
      (group) => group.date === date.toString(),
    );

    if (!groupForDate) {
      return 0;
    }

    const eventCount = Math.min(groupForDate.eventsList.length, 5);
    return (eventCount / 5) * 100;
  }
</script>

<CalendarSelector />

{#if $calendar && $calendar.calendarInstructions}
  <PageText text={$calendar.calendarInstructions} title="about calendar" />
{/if}

{#if $eventsByDate && $eventsByDate.length > 0 && $calendar}
  <Calendar.Root
    type="single"
    minValue={$calendar.startDate
      ? parseAbsoluteToLocal($calendar.startDate)
      : undefined}
    maxValue={$calendar.endDate
      ? parseAbsoluteToLocal($calendar.endDate)
      : undefined}
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
                      class={`border-black border
                      rounded data-[outside-month]:pointer-events-none
                      data-[outside-month]:text-gray-300
                      data-[selected]:bg-black
                      data-[selected]:text-white
                      data-[disabled]:opacity-50
                      data-[disabled]:border-0
                      bg-physical/${getBusynessOpacity(date)}
                      `}
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
  {#if filteredEvents.length > 0}
    {#each filteredEvents as group (group.date)}
      <div>
        <div
          id={`date-${group.date}`}
          class="sticky top-0 bg-bg-secondary text-center"
        >
          <Date date={group.date} format="date" />
        </div>
        {#each group.eventsList as event (event.id)}
          <EventRow {event} />
        {/each}
      </div>
    {/each}
  {:else}
    <p>No events on selected date</p>
  {/if}
{:else}
  <p>no events yet, please create one.</p>
  <a href="/app/events/create" class="button inline-block">create event</a>
{/if}

<Contribute />

{#if data.userRole === "admin"}
  <a class="button mt-4 inline-block" href="/app/calendars/edit"
    >Edit Calendar</a
  >
{/if}
