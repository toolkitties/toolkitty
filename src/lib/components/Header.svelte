<!-- 
 @component
 Header for our app that always visible at the top of the screen

 Displays:
 - Active calendar name
 - Page name
 - Back button
 - Avatar
  -->

<script lang="ts">
  import Back from "./Back.svelte";
  import { calendars } from "$lib/api";
  import Avatar from "./Avatar.svelte";
  import QuestionMark from "./QuestionMark.svelte";
  import { page } from "$app/stores";

  // TODO: change or remove default title once we have a name.
  let { title = "(^._.^)ﾉ", userRole } = $props();

  const activeCalendarName = calendars.getActiveCalendar;
</script>

<div
  class="p-3 right-2 w-full bg-grey-very-light space-y-1.5 border-b border-black header"
>
  <div class="flex justify-between border border-black rounded-full px-3">
    <span>{$activeCalendarName}</span>
    <span>{title}</span>
  </div>
  <div class="grid grid-cols-3 items-center h-10">
    <div class="flex flex-row items-center gap-2">
      <Back />
      {#if userRole === "admin" && $page.url.pathname === "/app/events"}
        <a
          class="button-green button inline-block text-center"
          href="/app/calendars/edit"
        >
          <span>edit</span>
        </a>
      {/if}
    </div>
    <Avatar />
    <!-- TODO add logic for question mark -->
    <QuestionMark />
  </div>
</div>
