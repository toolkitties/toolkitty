<script>
  import Back from "./Back.svelte";
  import { calendars } from "$lib/api";

  // TODO: change or remove default title once we have a name.
  let { title = "(^._.^)ﾉ" } = $props();

  const activeCalendarName = calendars.getActiveCalendar;
</script>

<div class="sticky top-0 left-0 p-2 right-2 w-full bg-white space-y-1.5">
  <div class="flex justify-between border border-black rounded-full px-2">
    <span>{$activeCalendarName}</span>
    <span>{title}</span>
  </div>
  <div>
    <Back />
  </div>
</div>
