<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import FestivalCalendar from "../../../components/festival-calendar.svelte";
  import EventRow from "../../../components/event-row.svelte";
  import { findMany as findEvents } from "$lib/api/events";

  let festivalDates: TimeSpan = {
    start: new Date("2025-01-06T14:40:02.536Z"),
    end: new Date("2025-01-11T14:40:02.536Z"),
  };

  let events: CalendarEvent[] = [];

  onMount(async () => {
    try {
      const fetchedEvents = await findEvents();
      events = [...fetchedEvents];
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });

  function handleUnauthNav(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedRoute = target.value;
    goto(selectedRoute);
  }

  let showCreateLinks = false;
</script>

<select name="unauth-nav" id="festival-select" on:change={handleUnauthNav}>
  <option value="/app/events">My Festival</option>
  <option value="/">My Other Festival</option>
  <!-- takes you back to join page for time being, until we know how switching festivals will be handled -->
  <option value="/">Join Festival</option>
  <option value="/create">Create New Festival</option>
</select>

<FestivalCalendar canSelectMultiple={false} {festivalDates} />

{#each events as event}
  <EventRow {event} />
{/each}

<div class="relative">
  <div class="fixed bottom-12 right-4 z-1 flex flex-col items-end space-y-2">
    {#if showCreateLinks}
      <div class="flex flex-col items-end space-y-2">
        <a href="/app/events/create" class="bg-white p-2 rounded shadow"
          >Space</a
        >
        <a href="/app/events/create" class="bg-white p-2 rounded shadow"
          >Resource</a
        >
        <a href="/app/events/create" class="bg-white p-2 rounded shadow"
          >Event</a
        >
      </div>
    {/if}

    <!-- Button -->
    <button
      on:click={() => (showCreateLinks = !showCreateLinks)}
      class="bg-black text-white px-4 py-2 rounded shadow"
    >
      Contribute
    </button>
  </div>
</div>
