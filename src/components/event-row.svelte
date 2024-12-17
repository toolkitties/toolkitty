<script type="ts">
  // TODO: Define the type of the event prop
  // @ts-ignore
  let { event } = $props();

  // TODO: possibly need to convert date to nice format from ISO 8601. TBC.
</script>

<a href={`/app/events/${event.id}`} class="flex border-black border event-row">
  <img
    src={event.image}
    alt=""
    class="aspect-square object-cover w-[30%] min-w-32"
  />
  <div class="flex flex-col gap-1 p-1">
    <h3>{event.title}</h3>
    <span>{event.date}</span>
    <span>{event.location}</span>
    <span class="line-clamp-2">{event.description}</span>
  </div>
</a>

<style>
  .event-row:not(:last-child) {
    border-bottom: 0px;
  }
</style>
