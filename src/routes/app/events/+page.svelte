<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";

  let { data }: PageProps = $props();
  let contributeButtonOpen = $state(false);
</script>

<CalendarSelector />
<h1 class="font-pixel">{data.title}</h1>
<a href="/app/calendars/create">Create Calendar</a>
{#if data.userRole === "admin"}
  <a href="/app/calendars/edit">Edit Calendar</a>
{/if}
<a href="/app/events/create">Create event</a>

{#each data.eventsList as event (event.id)}
  <EventRow {event} />
{/each}

<div class="relative">
  <div class="fixed bottom-20 right-4 z-20 flex flex-col items-end space-y-2">
    {#if contributeButtonOpen}
      <div class="flex flex-col items-end space-y-2">
        <a href="/app/spaces/create" class="bg-white">Space</a>
        <a href="/app/resources/create" class="bg-white">Resource</a>
        <a href="/app/events/create" class="bg-white">Event</a>
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
