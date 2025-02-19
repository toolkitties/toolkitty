<script>
  import EventRow from "../../../components/event-row.svelte";

  let events = [
    {
      id: 1,
      title: "Event 1",
      date: "Tuesday 19.09.25",
      time: "5:00pm - 7:30pm",
      location: "Location 1",
      image: "https://placecats.com/louie/300/200",
      tags: ["tag 1", "tag 2", "tag 3"],
    },
    {
      id: 2,
      title: "Event 2",
      date: "Tuesday 19.09.25",
      time: "5:00pm - 7:30pm",
      location: "Location 2",
      image: "https://placecats.com/bella/300/200",
      tags: ["tag 1", "tag 2", "tag 3"],
    },
  ];
</script>

<h1>Events page</h1>

<a href="/app/events/1">Event link </a>
<a href="/app/events/create">Create event</a>

{#each events as event}
  <EventRow {event} />
{/each}
