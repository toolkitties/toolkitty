<!-- 
 @component
 Display date range nice in a nice format.

 If event starts and ends on the same day it renders: 16.09.25 15:00 - 19:00
 If events start and end on different days it renders: 16.09.25 15:00 - 17.09.25 19:00
  -->
<script lang="ts">
  import Date from "$lib/components/Date.svelte";

  type Props = { startDate: string; endDate: string };

  const { startDate, endDate }: Props = $props();
  const isSameDay = startDate.split("T")[0] === endDate.split("T")[0];
</script>

{#if isSameDay}
  <Date date={startDate} format="datetime" /> - <Date
    date={endDate}
    format="time"
  />
{:else}
  <Date date={startDate} format="datetime" /> - <Date
    date={endDate}
    format="datetime"
  />
{/if}
