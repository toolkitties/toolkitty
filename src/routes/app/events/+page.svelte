<script lang="ts">
  import { onMount } from "svelte";
  import EventRow from "$lib/components/EventRow.svelte";
  import { findMany } from "$lib/api/events";

  let events: CalendarEvent[] = [];

  onMount(async () => {
    try {
      const fetchedEvents = await findMany();
      events = [...fetchedEvents];
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });
</script>

<br />
<br />
<br />
<h1 class="font-pixel">Events page</h1>
<a href="/app/events/create">Create event</a>

{#each events as event}
  <EventRow {event} />
{/each}
