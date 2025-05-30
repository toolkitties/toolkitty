<!-- 
 @component
 Render events for the events/home page
  -->

<script lang="ts">
  import Date from "./Date.svelte";
  let { event }: { event: CalendarEventEnriched } = $props();
</script>

<a
  href={`/app/events/view?id=${event.id}`}
  class="flex border-black border event-row"
>
  {#if event.images.length > 0}
    <img
      src={`blobstore://${event.images[0]}`}
      class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow"
      alt=""
    />
  {:else}
    <img
      src="/toolkitty-mascot.png"
      class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow"
      alt=""
    />
  {/if}
  <div class="flex flex-col gap-1 p-2">
    <h3>{event.name}</h3>
    <span>🗓️ <Date format="date" date={event.startDate} /></span>
    <span
      >🕣
      <Date format="time" date={event.startDate} /> -
      <Date format="time" date={event.endDate} />
    </span>
    <span>📍 {event.spaceRequest?.space ? event.spaceRequest.space!.name : "no space yet"}</span>
  </div>
</a>

<style>
  .event-row:not(:last-child) {
    border-bottom: 0px;
  }
</style>
