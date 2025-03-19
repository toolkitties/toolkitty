<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";
  import { liveQuery } from "dexie";
  import { calendars, events } from "$lib/api";
  import PageText from "$lib/components/PageText.svelte";

  let { data }: PageProps = $props();
  let contributeButtonOpen = $state(false);

  function getDay(event: CalendarEventEnriched): string {
    return event.startDate.split('T')[0];
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
    const allEvents = await events.findMany(data.activeCalendarId);
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
    const calendar = await calendars.findById(data.activeCalendarId);
    return calendar?.calendarInstructions;
  });
</script>

<CalendarSelector />
<h1 class="font-pixel">{data.title}</h1>
<a href="#/create">Create Calendar</a>
{#if data.userRole === "admin"}
  <a href="#/app/calendars/edit">Edit Calendar</a>
{/if}
<a href="#/app/events/create">Create event</a>

{#if $calendarInstructions}
  <PageText text={$calendarInstructions} title="about calendar" />
{/if}

{#each $eventsByDate as date (date.date)}
  <h2>{date.date}</h2>
  {#each date.eventsList as event (event.id)}
    <EventRow {event} />
  {/each}
{/each}

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
