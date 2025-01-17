<script>
  import { addEvent } from "$lib/api";
  import { db } from "$lib/db";
  import { event } from "@tauri-apps/api";
  import { liveQuery } from "dexie";

  let events = liveQuery(() =>
    db.events
      .where(["start", "end"])
      .between(
        ["2025-01-17T00:00:00Z", "2025-01-17T00:00:00Z"],
        ["2025-01-18T00:00:00Z", "2025-01-18T00:00:00Z"]
      )
      .toArray()
  );

  // create some events

  // import EventRow from "../../../components/event-row.svelte";

  // let events = [
  //   {
  //     id: 1,
  //     title: "Event 1",
  //     date: "Tuesday 19.09.25",
  //     time: "5:00pm - 7:30pm",
  //     location: "Location 1",
  //     image: "https://placecats.com/louie/300/200",
  //     tags: ["tag 1", "tag 2", "tag 3"],
  //   },
  //   {
  //     id: 2,
  //     title: "Event 2",
  //     date: "Tuesday 19.09.25",
  //     time: "5:00pm - 7:30pm",
  //     location: "Location 2",
  //     image: "https://placecats.com/bella/300/200",
  //     tags: ["tag 1", "tag 2", "tag 3"],
  //   },
  // ];

  async function addEvents() {
    addEvent({
      id: "2",
      name: "Event 1",
      start: "2025-01-17T12:00:00Z",
      end: "2025-01-17T10:00:00Z",
    });
    addEvent({
      id: "2",
      name: "Event 2",
      start: "2025-01-17T12:00:00Z",
      end: "2025-01-17T10:00:00Z",
    });
    addEvent({
      id: "3",
      name: "Event 3",
      start: "2024-01-17T12:00:00Z",
      end: "2024-01-17T10:00:00Z",
    });
  }
</script>

<h1>Events page</h1>

<a href="/app/events/1">Event link </a>
<a href="/app/events/create">Create event</a>
<button on:click={addEvents}>Add events</button>

<!-- {#each events as event}
  <EventRow {event} />
{/each} -->

{#if events}
  {#each $events as event}
    <div>
      <h2>{event.name}</h2>
      <p>{event.start}</p>
      <p>{event.end}</p>
    </div>
  {/each}
{/if}
