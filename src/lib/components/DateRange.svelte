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
