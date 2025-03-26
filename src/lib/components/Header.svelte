<!-- 
 @component
 Header for our app that always visible at the top of the screen

 Displays:
 - Active calendar name
 - Page name
 - Back button
 - Avatar
  -->

<script>
  import Back from "./Back.svelte";
  import { calendars } from "$lib/api";
  import Avatar from "./Avatar.svelte";

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
  <div class="grid grid-cols-3 items-center h-10">
    <Back />
    <Avatar />
  </div>
</div>
