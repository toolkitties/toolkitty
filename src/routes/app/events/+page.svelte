<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";
  import { liveQuery } from "dexie";
  import { calendars, events } from "$lib/api";
  import PageText from "$lib/components/PageText.svelte";
  import Contribute from "$lib/components/Contribute.svelte";
  import Date from "$lib/components/Date.svelte";

  let { data }: PageProps = $props();

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

  let calendarInstructions = liveQuery(async () => {
    const activeCalendarId = await calendars.getActiveCalendarId();
    if (!activeCalendarId) return undefined;
    const calendar = await calendars.findById(activeCalendarId);
    return calendar?.calendarInstructions;
  });
</script>

<CalendarSelector />

{#if $calendarInstructions}
  <PageText text={$calendarInstructions} title="about calendar" />
{/if}

{#if $eventsList && $eventsList.length > 0}
  {#each $eventsByDate as group (group.date)}
  <Date date={group.date} format="date" />
  {#each group.eventsList as event (event.id)}
    <EventRow {event} />
  {/each}
{/each}
{:else}
  <p>no events yet, please create one.</p>
  <a href="#/app/events/create" class="button inline-block">create event</a>
{/if}

<Contribute />

<div class="relative">
  <div class="fixed bottom-20 right-4 z-20 flex flex-col items-end space-y-2">
    {#if contributeButtonOpen}
      <div class="flex flex-col items-end space-y-2">
        <a href="#/app/spaces/create" class="bg-white">Space</a>
        <a href="#/app/resources/create" class="bg-white">Resource</a>
        <a href="#/app/events/create" class="bg-white">Event</a>
      </div>
    {/if}

    <button
      onclick={() => (contributeButtonOpen = !contributeButtonOpen)}
      class="bg-black text-white"
    >
      Contribute
    </button>
  </div>
</div>

{#if data.userRole === "admin"}
  <a class="button mt-4 inline-block" href="#/app/calendars/edit"
    >Edit Calendar</a
  >
{/if}
