<script>
  import { onMount } from "svelte";
  import Back from "./back.svelte";
  import { calendars } from "$lib/api"

  let { title = "Default Title" } = $props();

  const activeCalendarName = calendars.getActiveCalendar

</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="fixed top-0 left-0 p-2 right-2 w-full bg-white space-y-1.5">
  <div class="flex justify-between border border-black rounded-full px-2">
    <h1>{title}</h1>
    {#if $activeCalendarName}
      <div class="w-[42px]">{$activeCalendarName}</div>
    {/if}
  </div>
  <div>
    <Back />
  </div>
</div>

