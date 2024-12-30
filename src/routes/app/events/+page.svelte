<script lang="ts">
  import type { DateValue } from "@internationalized/date";
  import { CalendarDate } from "@internationalized/date";
  import CustomCalendar from '../../../components/CustomCalendar.svelte';
  import EventRow from "../../../components/event-row.svelte";

  const festivalDates: DateValue[] = [
      new CalendarDate(2024, 12, 11),
      new CalendarDate(2024, 12, 12),
      new CalendarDate(2024, 12, 13),
      new CalendarDate(2024, 12, 14),
      new CalendarDate(2024, 12, 15),
      new CalendarDate(2024, 12, 16),
  ];

  const eventsCount: Object[] = [
      {
          date: new CalendarDate(2024, 12, 11),
          numberOfEvents: 5
      },
      {
          date: new CalendarDate(2024, 12, 12),
          numberOfEvents: 3
      },
      {
          date: new CalendarDate(2024, 12, 13),
          numberOfEvents: 2
      },
      {
          date: new CalendarDate(2024, 12, 14),
          numberOfEvents: 4
      },
      {
          date: new CalendarDate(2024, 12, 15),
          numberOfEvents: 1
      },
      {
          date: new CalendarDate(2024, 12, 16),
          numberOfEvents: 0
      },
  ]

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

<h1>My Festival</h1>

<CustomCalendar 
    use={"festival overview"}
    canSelectMultiple={false} 
    hasTimePicker={false} 
    festivalDates={festivalDates} 
    eventsCount={eventsCount}
/>

<a href="/app/events/1">Event link </a>
<a href="/app/events/create">Create event</a>

{#each events as event}
  <EventRow {event} />
{/each}
