<script lang="ts">
  import Date from "./Date.svelte";
  // TODO: Define the type of the event prop

  let { event }: { event: CalendarEventEnriched } = $props();

  // TODO: possibly need to convert date to nice format from ISO 8601. TBC.

  // tag colour possibly comes from event rather than hard coded light this.
  // let tagColours = ["bg-yellow-light", "bg-fluro-green-light", "bg-red-light"];
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
    <span>🗓️ <Date date={event.startDate} /></span>
    <span>🕣 <Date date={event.endDate} /></span>
    <span>📍 {event.space ? event.space.name : "no space yet"}</span>
  </div>
</a>

<style>
  .event-row:not(:last-child) {
    border-bottom: 0px;
  }
</style>
