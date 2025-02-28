<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";

  let { data }: PageProps = $props();

  let contributeButtonOpen = $state(false);
</script>

<br />
<br />
<br />
<h1 class="font-pixel">{data.title}</h1>
<a href="/app/calendars/{data.activeCalendarId}/edit">Edit Calendar</a>
<a href="/app/events/create">Create event</a>

{#each data.eventsList as event}
  <EventRow {event} />
{/each}

<div class="relative">
  <div class="fixed bottom-20 right-4 z-20 flex flex-col items-end space-y-2">
    {#if contributeButtonOpen}
      <div class="flex flex-col items-end space-y-2">
        <a href="/app/events/create" class="bg-white">Space</a>
        <a href="/app/resources/create" class="bg-white">Resource</a>
        <a href="/app/spaces/create" class="bg-white">Event</a>
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

<p>Invite code: (first 4 chars): {data.activeCalendarId}</p>
