<script lang="ts">
  import { calendars } from "$lib/api";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Select } from "bits-ui";
  import ChevronIcon from "$lib/components/icons/ChevronIcon.svelte";

  let calendarList: Calendar[] = $state([]);
  let selectedCalendar = $state("");
  const selectedCalendarName = $derived(
    selectedCalendar
      ? calendarList.find((calendar) => calendar.id === selectedCalendar)?.name
      : "Select a calendar",
  );

  onMount(async () => {
    let activeCalendar = await calendars.getActiveCalendarId();
    selectedCalendar = activeCalendar!;
    calendarList = await calendars.findMany();
  });

  function handleCalendarSelected(calendarId: Hash) {
    calendars.setActiveCalendar(calendarId);

    // reload page on the client side
    invalidateAll();
  }
</script>

{#if calendarList.length > 0}
  <Select.Root
    type="single"
    bind:value={selectedCalendar}
    onValueChange={(value) => handleCalendarSelected(value)}
  >
    <Select.Trigger class="w-full flex items-center">
      <span class="flex-grow">
        {selectedCalendarName}
      </span>
      <ChevronIcon size={16} />
    </Select.Trigger>
    <Select.Portal>
      <Select.Content>
        <Select.Viewport class="bg-bg border p-2 flex flex-col w-full">
          {#each calendarList as calendar}
            <Select.Item value={calendar.id} label={calendar.name}
              >{calendar.name}</Select.Item
            >
          {/each}
          <a href="/join">Join Calendar</a>
          <a href="/create">+ Create new calendar</a>
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
{/if}
