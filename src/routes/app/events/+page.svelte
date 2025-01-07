<script lang="ts">
  import { goto } from '$app/navigation';
  import { CalendarDate  } from "@internationalized/date";
  import Calendar from '../../../components/calendar.svelte';
  import EventRow from "../../../components/event-row.svelte";

  /* Festival dates will either be fetched via the 'festival_dates' property -
    an array of non-consectutive dates OR via start_date and end_date. If the 
    latter, we will need a function to build an array of all dates between start
    and end (TODO)*/
  let festivalDates = [
    "2025-01-06T14:40:02.536Z", 
    "2025-01-07T14:40:02.536Z", 
    "2025-01-08T14:40:02.536Z", 
    "2025-01-09T14:40:02.536Z", 
    "2025-01-10T14:40:02.536Z",
    "2025-01-11T14:40:02.536Z"
  ]

  // convert festival dates to CalendarDate values so calendar component can work with them
  let festivalDateValues = festivalDates.map(dateString => {
    let date = new Date(dateString);
    return new CalendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  })

 let events = [
    {
      "id": 1,
      "title": "Really Cool Event",
      "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "location": "Cool Venue",
      "date": "2025-01-06T14:40:02.536Z",
      "start_time": "19:00",
      "end_time": "21:30",
      "space": {
        "name": "Main Stage",
        "booked_dated": "2025-01-06T14:40:02.536Z",
        "booked_timeslots": ["18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"]
      },
      "resources": [
        {
          "title": "Projector",
          "booked_dated": "2025-01-06T14:40:02.536Z",
          "booked_timeslots": ["18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"]
        },
        {
          "title": "XLR Cables",
          "booked_dated": "2025-01-06T14:40:02.536Z",
          "booked_timeslots": ["18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"]
        }
      ],
      "image": "https://placecats.com/louie/300/200",
      "tags": ["tag 1", "tag 2", "tag 3"]
    },
    {
      "id": 2,
      "title": "Another Event",
      "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "location": "Another Venue",
      "date": "2025-01-10T14:40:02.536Z",
      "start_time": "19:00",
      "end_time": "21:30",
      "space": {
        "name": "Recording Studio",
        "booked_dated": "2025-01-10T14:40:02.536Z",
        "booked_timeslots": ["10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00"]
      },
      "resources": [
      ],
      "image": "https://placecats.com/bella/300/200",
      "tags": ["tag 1", "tag 2", "tag 3"]
    }
  ]

  function handleUnauthNav(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedRoute = target.value;
    goto(selectedRoute);
  }

  let showCreateLinks = false;
</script>

<select name="unauth-nav" id="festival-select" on:change={handleUnauthNav}>
  <option value="/app/events">My Festival</option>
  <option value="/">My Other Festival</option> <!-- takes you back to join page for time being, until we know how switching festivals will be handled -->
  <option value="/">Join Festival</option>
  <option value="/create">Create New Festival</option>
</select>

<Calendar 
    use={"festival overview"}
    canSelectMultiple={false} 
    hasTimePicker={false} 
    festivalDates={festivalDateValues} 
/>

{#each events as event}
  <EventRow {event} />
{/each}

<div class="relative">
  <div class="fixed bottom-12 right-4 z-1 flex flex-col items-end space-y-2">
    {#if showCreateLinks}
      <div class="flex flex-col items-end space-y-2">
        <a href="/app/events/create" class="bg-white p-2 rounded shadow">Space</a>
        <a href="/app/events/create" class="bg-white p-2 rounded shadow">Resource</a>
        <a href="/app/events/create" class="bg-white p-2 rounded shadow">Event</a>
      </div>
    {/if}

    <!-- Button -->
    <button 
      on:click={() => (showCreateLinks = !showCreateLinks)} 
      class="bg-black text-white px-4 py-2 rounded shadow">
      Contribute
    </button>
  </div>
</div>


