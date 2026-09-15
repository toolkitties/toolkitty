<!-- 
 @component
 View availability of a resource or space.

 Used in events view/create/edit
  -->

<script lang="ts">
  import type { DateValue } from "@internationalized/date";
  import { fromDate } from "@internationalized/date";
  import { spaces } from "$lib/api";
  import Calendar from "$lib/components/Calendar.svelte";
  import Bookings from "./Bookings.svelte";
  import { TimeSpanClass } from "$lib/timeSpan";

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
  let availabilityByDay: TimeSpan | null = $state(null);
  let selectedDate = selected ? fromDate(new Date(selected), "UTC") : undefined;
  let currentlySelectedDate: DateValue | undefined = $state(selectedDate);
  let booked: BookingRequest[] = $state([]);
  let loading: boolean = $state(true);

  const handleDateSelect = async (
    value: DateValue | DateValue[] | undefined,
  ) => {
    if (!value) {
      availabilityByDay = null;
      booked = [];
      return;
    }
    if (Array.isArray(value)) {
      value = value[0];
    }

    if (!value) {
      availabilityByDay = null;
      booked = [];
      return;
    }

    loading = true;
    availabilityByDay = null;

    for (let timeSpan of availability) {
      let timeSpanStartDateValue = fromDate(new Date(timeSpan.start), "UTC");
      if (isSameDate(timeSpanStartDateValue, value)) {
        availabilityByDay = { start: timeSpan.start, end: timeSpan.end };

        booked = await spaces.findBookings(
          data.id,
          new TimeSpanClass(availabilityByDay),
        );

        loading = false;
        break;
      }
    }
  };

  const isSameDate = (date1: DateValue, date2: DateValue): boolean => {
    return (
      date1.year === date2.year &&
      date1.month === date2.month &&
      date1.day === date2.day
    );
  };

  function isAvailableDay(date: DateValue) {
    return availability.some(({ start }) => {
      const availableDate: DateValue = fromDate(new Date(start), "UTC"); //@TODO - think about how to properly handle timezone
      return date.compare(availableDate) === 0;
    });
  }

  const getDayClass = (date: DateValue) =>
    isAvailableDay(date) ? "bg-green-300" : "text-gray-400 pointer-events-none";

  const getDayAriaDisabled = (date: DateValue) =>
    !isAvailableDay(date) || undefined;

  // Trigger a "dateSelect" event so that the initial UI shows availability.
  handleDateSelect(selectedDate);
</script>

<Calendar
  type="single"
  bind:value={currentlySelectedDate}
  onValueChange={handleDateSelect}
  dayClass={getDayClass}
  dayAriaDisabled={getDayAriaDisabled}
/>
{#if currentlySelectedDate && !loading}
  <Bookings availability={availabilityByDay} {data} {booked} />
{/if}
{#if data.multiBookable}
  <p>
    This {#if type == "space"}space{/if}
    {#if type == "resource"}resource{/if} can have multiple bookings at the same
    time.
  </p>
{/if}
