<!-- 
 @component
 Change the active calendar, create or join a calendar
 
 When active calendar is changed the following happens:
 - activeCalendar is updated in frontend database settings table.
 - All data in app in invalidated (client side page reload)
  -->

<script lang="ts">
  import { calendars } from "$lib/api";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Select, Accordion } from "bits-ui";
  import ChevronIcon from "$lib/components/icons/ChevronIcon.svelte";

  let calendarList: Calendar[] = $state([]);
  let selectedCalendar = $state("");
  let selectedCalendarName = $state("");

  onMount(async () => {
    let activeCalendar = await calendars.getActiveCalendarId();
    selectedCalendar = activeCalendar!;
    calendarList = await calendars.findMany();
    selectedCalendarName =
      calendarList.find((calendar) => calendar.id === selectedCalendar)?.name ||
      "Select a calendar";
  });

  async function handleCalendarSelected(calendarId: Hash) {
    calendars.setActiveCalendar(calendarId);
    invalidateAll();
    selectedCalendarName =
      calendarList.find((calendar) => calendar.id === calendarId)?.name ||
      "Select a calendar";
  }
</script>

{#if calendarList.length > 0}
  <div class="space-y-4">
    <!-- Accordion Version -->
    <Accordion.Root type="single" class="w-full">
      <Accordion.Item value="calendar-list" data-state="closed">
        <Accordion.Trigger
          class="w-full flex items-center justify-between p-[6px] text-[45px] bg-[var(--color-light-yellow)] font-[Handjet] border border-black uppercase"
        >
          <span class="grow">{selectedCalendarName}</span>
          <ChevronIcon size={16} />
        </Accordion.Trigger>

        <Accordion.Content class="border border-black border-t-0 text-center">
          <div>
            {#each calendarList as calendar (calendar.id)}
              <button
                class="w-full p-2 bg-[var(--color-grey-very-light)] text-center justify-center flex items-center border-b border-black border-l-0 border-r-0 border-t-0 rounded-none"
                onclick={() => handleCalendarSelected(calendar.id)}
              >
                {calendar.name}
              </button>
            {/each}
            <div class="flex flex-col">
              <a
                href="/join"
                class="text-[20px] bg-[var(--color-grey-medium)] px-2 py-1 text-center border-b border-black"
                >Join Calendar</a
              >
              <a
                href="/create"
                class="text-[20px] bg-[var(--color-green-light-fluro)] px-2 py-1 rounded-bl-[10px] rounded-br-[10px] text-center"
                >+ Create new calendar</a
              >
            </div>
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  </div>
{/if}
