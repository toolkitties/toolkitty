<script lang="ts">
  import type { PageProps } from "./$types";
  import EventRow from "$lib/components/EventRow.svelte";

  let { data }: PageProps = $props();
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

<p>Invite code: (first 4 chars): {data.activeCalendarId}</p>
