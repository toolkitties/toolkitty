<script type="ts">
  // TODO: Define the type of the event prop
  // @ts-ignore
  let { event } = $props();

  // TODO: possibly need to convert date to nice format from ISO 8601. TBC.

  // tag colour possibly comes from event rather than hard coded light this.
  let tagColours = ["bg-yellow-light", "bg-fluro-green-light", "bg-red-light"];
</script>

<a href={`/app/events/${event.id}`} class="flex border-black border event-row">
  <img
    src={event.images[0]}
    alt=""
    class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow"
  />
  <div class="flex flex-col gap-1 p-2">
    <h3>{event.name}</h3>
    <span>🗓️ {event.startDate}</span>
    <span>🕣 {event.startDate}</span>
    <span>📍 {event.location ? event.location : "no space yet"}</span>
  </div>
</a>

<style>
  .event-row:not(:last-child) {
    border-bottom: 0px;
  }
</style>
