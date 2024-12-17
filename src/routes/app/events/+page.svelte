<script>
  import EventRow from "../../../components/event-row.svelte";

  let events = [
    {
      id: 1,
      title: "Event 1",
      date: "2025-01-01",
      location: "Location 1",
      description:
        "We are convening to discuss potential risks involved in playing the latest version of the game and how to mitigate them. Should be fun plz stop by.",
      image: "https://placecats.com/louie/300/200",
    },
    {
      id: 2,
      title: "Event 2",
      date: "2025-01-02",
      location: "Location 2",
      description:
        "We are convening to discuss potential risks involved in playing the latest version of the game and how to mitigate them. Should be fun plz stop by.",
      image: "https://placecats.com/bella/300/200",
    },
  ];
</script>

<h1>Events page</h1>

<a href="/app/events/1">Event link </a>
<a href="/app/events/create">Create event</a>

{#each events as event}
  <EventRow {event} />
{/each}
