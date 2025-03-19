<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";
  import { liveQuery } from "dexie";
  import { calendars, events } from "$lib/api";
  import PageText from "$lib/components/PageText.svelte";

  let { data }: PageProps = $props();
  let contributeButtonOpen = $state(false);

  let eventsList = liveQuery(async () => {
    return events.findMany(data.activeCalendarId);
  });

  let calendarInstructions = liveQuery(async () => {
    const calendar = await calendars.findById(data.activeCalendarId);
    return calendar?.calendarInstructions;
  });
</script>

<CalendarSelector />

{#if $calendarInstructions}
  <PageText text={$calendarInstructions} title="about calendar" />
{/if}

{#each $eventsList as event (event.id)}
  <EventRow {event} />
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

{#if data.userRole === "admin"}
  <a class="button mt-4 inline-block" href="#/app/calendars/edit"
    >Edit Calendar</a
  >
{/if}
