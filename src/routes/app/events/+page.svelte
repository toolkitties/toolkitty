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
  import type { DateValue } from "@internationalized/date";
  import Calendar from "$lib/components/Calendar.svelte";

  let { data }: PageProps = $props();
  let selectedDate: DateValue | undefined = $state();

  function getDateKey(date: DateValue | string): string {
    return date.toString().split("T")[0];
  }

  function getDay(event: CalendarEventEnriched): string {
    return getDateKey(event.startDate);
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

    const eventsGroupedByDate = new Map<string, CalendarEventEnriched[]>();

    for (const event of allEvents) {
      const startDay = getDay(event);
      const eventsForDate = eventsGroupedByDate.get(startDay) ?? [];
      eventsForDate.push(event);
      eventsGroupedByDate.set(startDay, eventsForDate);
    }

    return [...eventsGroupedByDate.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, eventsList]) => ({
        date,
        eventsList: eventsList.sort((a, b) =>
          a.startDate.localeCompare(b.startDate),
        ),
      }));
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

    const selectedDateString = getDateKey(selectedDate);
    return $eventsByDate.filter(
      (group) => getDateKey(group.date) === selectedDateString,
    );
  });

  function handleDateSelected(value: DateValue | undefined) {
    if (value && selectedDate?.toString() === value.toString()) {
      selectedDate = undefined;
      return;
    }

    selectedDate = value;
  }
</script>

<CalendarSelector />

{#if $calendar && ($calendar.startDate || $calendar.endDate)}
  <div class="text-center text-[25px] leading-[24px] py-3.5">
    {#if $calendar.startDate}
      <Date date={$calendar.startDate} format="dateshort" />
    {/if}
    {#if $calendar.endDate}
      &nbsp;- <Date date={$calendar.endDate} format="dateshort" />
    {/if}
  </div>
  {#if $calendar.calendarInstructions}
    <div class="text-center">
      <PageText text={$calendar.calendarInstructions} title="About calendar" />
    </div>
  {/if}
{/if}

{#if $eventsByDate && $eventsByDate.length > 0 && $calendar}
  <div class="py-3.5 -mx-3.5">
    <div class="border-y border-black bg-grey-light">
      <div
        class="flex min-h-9 items-center justify-between border-b border-black bg-grey-medium px-3 text-[20px] leading-none"
      >
        <span>date</span>
        {#if selectedDate}
          <button
            type="button"
            class="border-0 bg-transparent p-0 text-[15px] leading-none underline"
            onclick={() => (selectedDate = undefined)}
          >
            show all
          </button>
        {/if}
      </div>
      <Calendar
        type="single"
        variant="standard"
        value={selectedDate}
        onValueChange={handleDateSelected}
        busyness={$eventsByDate}
        placeholder={$calendar.startDate
          ? parseAbsoluteToLocal($calendar.startDate)
          : undefined}
      />
    </div>

    {#if filteredEvents.length > 0}
      {#each filteredEvents as group, i (group.date)}
        <div>
          <div
            id={`date-${group.date}`}
            class="top-0 bg-bg-secondary text-center text-[20px] {i === 0
              ? 'border-t border-t-black'
              : ''}"
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
  </div>
{:else}
  <div class="flex flex-col items-center justify-center m-8">
    <p>No events yet, please create one.</p>
    <a href="/app/events/create" class="button button-green inline-block m-5"
      >create event</a
    >
  </div>
{/if}

<Contribute />

{#if data.userRole === "admin"}
  <a
    class="button-green button mt-4 inline-block w-full text-center"
    href="/app/calendars/edit"><span>edit calendar</span></a
  >
{/if}
