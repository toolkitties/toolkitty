<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";
  import { liveQuery } from "dexie";
  import { calendars, events } from "$lib/api";
  import PageText from "$lib/components/PageText.svelte";
  import Contribute from "$lib/components/Contribute.svelte";

  let { data }: PageProps = $props();

  let eventsList = liveQuery(async () => {
    const activeCalendarId = await calendars.getActiveCalendarId();
    if (!activeCalendarId) return [];
    return events.findMany(activeCalendarId);
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
  {#each $eventsList as event (event.id)}
    <EventRow {event} />
  {/each}
{:else}
  <p>no events yet, please create one.</p>
  <a href="#/app/events/create" class="button">create event</a>
{/if}

<Contribute />

{#if data.userRole === "admin"}
  <a class="button mt-4 inline-block" href="#/app/calendars/edit"
    >Edit Calendar</a
  >
{/if}
