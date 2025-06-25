<!-- 
 @component
 Render events for the events/home page
  -->

<script lang="ts">
  import Date from "./Date.svelte";
  import CalendarIcon from "./icons/CalendarIcon.svelte";
  import ClockIcon from "./icons/ClockIcon.svelte";
  import PinIcon from "./icons/PinIcon.svelte";
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
  <div class="flex flex-col gap-2 p-3 w-full">
    <h3 class="text-[20px]">{event.name}</h3>
    <div class="flex gap-2">
      <div class="flex items-center justify-center">
        <CalendarIcon size={16} />
      </div>
      <div class="pt-1 flex items-center">
        <Date format="date" date={event.startDate} />
      </div>
    </div>
    <div class="flex gap-2">
      <div class="flex items-center justify-center">
        <ClockIcon size={16} />
      </div>
      <div class="pt-1 flex items-center">
        <Date format="time" date={event.startDate} /> - <Date
          format="time"
          date={event.endDate}
        />
      </div>
    </div>
    <div class="flex gap-2">
      <div class="flex items-center justify-center">
        <PinIcon size={16} />
      </div>
      <div class="pt-1 flex items-center">
        {event.spaceRequest?.space
          ? event.spaceRequest.space!.name
          : "no space yet"}
      </div>
    </div>
  </div></a
>

<style>
  .event-row:not(:last-child) {
    border-bottom: 0px;
  }
</style>
