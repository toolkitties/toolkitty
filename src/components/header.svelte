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

<div class="fixed top-0 left-0 p-2 right-2 flex items-center w-full bg-white">
  <Back />
  <h1 class="grow text-center">{title}</h1>
  {#if $activeCalendarName}
    <div class="w-[42px]">{$activeCalendarName}</div>
  {/if}
</div>
