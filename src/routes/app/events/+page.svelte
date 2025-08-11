<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";
  import { liveQuery } from "dexie";
  import { calendars, events } from "$lib/api";
  import PageText from "$lib/components/PageText.svelte";
  import Contribute from "$lib/components/Contribute.svelte";
  import Date from "$lib/components/Date.svelte";
  import { parseAbsoluteToLocal } from "@internationalized/date";
  import type { CalendarDate } from "@internationalized/date";
  import Calendar from "$lib/components/Calendar.svelte";

  let { data }: PageProps = $props();
  let selectedDate: CalendarDate | undefined = $state();

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
    if (!selectedDate) {
      return $eventsByDate;
    }

    return $eventsByDate.filter(
      (group) => group.date === selectedDate.toString(),
    );
  });
</script>

<CalendarSelector />

{#if $calendar && $calendar.calendarInstructions}
  <PageText text={$calendar.calendarInstructions} title="about calendar" />
  {#if $calendar.startDate}
    <Date date={$calendar.startDate} format="dateshort" />
  {/if}
  {#if $calendar.endDate}
    &nbsp;- <Date date={$calendar.endDate} format="dateshort" />
  {/if}
{/if}

{#if $eventsByDate && $eventsByDate.length > 0 && $calendar}
  <Calendar
    type="single"
    bind:value={selectedDate}
    busyness={$eventsByDate}
    minValue={$calendar.startDate
      ? parseAbsoluteToLocal($calendar.startDate)
      : undefined}
    maxValue={$calendar.endDate
      ? parseAbsoluteToLocal($calendar.endDate)
      : undefined}
  />

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
  <a
    class="button bg-green-light-fluro justify-center rounded-xl mt-4 inline-block w-full text-center"
    href="/app/calendars/edit"
  >
    <span class="edit-icon">edit calendar</span>
  </a>
{/if}
