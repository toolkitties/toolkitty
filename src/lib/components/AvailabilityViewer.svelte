<!-- 
 @component
 View availability of a resource or space.

 Used in events view/create/edit
  -->

<script lang="ts">
  import Calendar from "./Calendar.svelte";
  import type { DateValue } from "@internationalized/date";
  import { fromDate } from "@internationalized/date";
  import { spaces } from "$lib/api";
  import Bookings from "./Bookings.svelte";
  import { TimeSpanClass } from "$lib/timeSpan";
  import BookingRequest from "./BookingRequest.svelte";

  let {
    data,
    selected,
    type,
  }: {
    data: Space | Resource;
    selected?: string;
    onChange?: () => void;
    type: string;
  } = $props();
  let availability: TimeSpan[] = Array.isArray(data.availability)
    ? data.availability
    : [];
  let selectedDate = selected ? fromDate(new Date(selected), "UTC") : undefined;
  let currentlySelectedDate: DateValue | undefined = $state(selectedDate);

  let availabilityByDay: TimeSpan | null = $derived.by(() => {
    if (!currentlySelectedDate) {
      return null;
    }

    for (let timeSpan of availability) {
      let timeSpanStartDateValue = fromDate(new Date(timeSpan.start), "UTC");
      if (isSameDate(timeSpanStartDateValue, currentlySelectedDate)) {
        return { start: timeSpan.start, end: timeSpan.end };
      }
    }

    return null;
  });

  let booked = $derived.by(async () => {
    if (!availabilityByDay) {
      return [];
    }
    return await spaces.findBookings(
      data.id,
      new TimeSpanClass(availabilityByDay),
    );
  });

  const isSameDate = (date1: DateValue, date2: DateValue): boolean => {
    return (
      date1.year === date2.year &&
      date1.month === date2.month &&
      date1.day === date2.day
    );
  };
</script>

<Calendar type="single" bind:value={currentlySelectedDate} {availability} />
{#await booked then bookedData}
  {#if currentlySelectedDate}
    <Bookings availability={availabilityByDay} {data} booked={bookedData} />
  {/if}
{/await}
{#if data.multiBookable}
  <p>
    This {#if type == "space"}space{/if}
    {#if type == "resource"}resource{/if} can have multiple bookings at the same
    time.
  </p>
{/if}
