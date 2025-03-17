<script>
  import Back from "./Back.svelte";
  import { calendars } from "$lib/api";

  // TODO: change or remove default title once we have a name.
  let { title = "(^._.^)ﾉ" } = $props();

  const activeCalendarName = calendars.getActiveCalendar;
</script>

<div
  class="fixed top-0 left-0 p-3 right-2 w-full bg-grey-very-light space-y-1.5 border-b border-black"
>
  <div class="flex justify-between border border-black rounded-full px-3">
    <span>{$activeCalendarName}</span>
    <span>{title}</span>
  </div>
  <div>
    <Back />
  </div>
</div>
