<!--
 @component
 Read-only availability calendar for a space or resource.

 Used in space/resource views and event create/edit forms.
-->

<script lang="ts">
  import { fromDate, parseDate, type DateValue } from "@internationalized/date";
  import { spaces } from "$lib/api";
  import { onMount } from "svelte";
  import Calendar from "$lib/components/Calendar.svelte";
  import { TimeSpanClass } from "$lib/timeSpan";
  import {
    availabilityTimeSlots,
    slotDateTime,
  } from "$lib/utils/availabilitySlots";

  let {
    data,
    selected,
    type,
    calendarDates,
    title,
    showSlots = true,
    onDateChange,
  }: {
    data: Space | Resource;
    selected?: string;
    type: string;
    calendarDates?: TimeSpan;
    title?: string;
    showSlots?: boolean;
    onDateChange?: (date: string) => void;
  } = $props();

  let availability: TimeSpan[] = $derived(
    Array.isArray(data.availability) ? data.availability : [],
  );
  let alwaysAvailable = $derived(data.availability === "always");

  const toDateKey = (value: string | DateValue) =>
    value.toString().split("T")[0];

  const firstAvailableDate = availability[0]?.start
    ? toDateKey(availability[0].start)
    : calendarDates?.start
      ? toDateKey(calendarDates.start)
      : undefined;

  const initialDate = selected
    ? fromDate(new Date(selected), "UTC")
    : firstAvailableDate
      ? parseDate(firstAvailableDate)
      : undefined;
  let currentlySelectedDate: DateValue | undefined = $state(initialDate);
  let calendarPlaceholder: DateValue | undefined = $state(initialDate);
  let booked: BookingRequestEnriched[] = $state([]);
  let loading = $state(false);

  function isInCalendarRange(date: DateValue): boolean {
    if (!calendarDates) return true;
    const dateKey = toDateKey(date);
    const start = toDateKey(calendarDates.start);
    const end = calendarDates.end ? toDateKey(calendarDates.end) : undefined;
    return dateKey >= start && (!end || dateKey <= end);
  }

  function isAvailableDay(date: DateValue): boolean {
    if (!isInCalendarRange(date)) return false;
    if (alwaysAvailable) return true;
    const dateKey = toDateKey(date);
    return availability.some((entry) => toDateKey(entry.start) === dateKey);
  }

  function isSlotAvailable(date: string, start: string, end: string): boolean {
    if (alwaysAvailable) return true;

    const slotStart = new Date(`${date}T${start}`).getTime();
    const slotEnd = new Date(slotDateTime(date, end)).getTime();
    return availability.some((entry) => {
      const availableStart = new Date(entry.start).getTime();
      const availableEnd = new Date(entry.end).getTime();
      return availableStart <= slotStart && availableEnd >= slotEnd;
    });
  }

  function isSlotBooked(date: string, start: string, end: string): boolean {
    const slotStart = new Date(`${date}T${start}`).getTime();
    const slotEnd = new Date(slotDateTime(date, end)).getTime();

    return booked.some((booking) => {
      const bookingStart = new Date(booking.timeSpan.start).getTime();
      const bookingEnd = new Date(booking.timeSpan.end).getTime();
      return bookingStart < slotEnd && bookingEnd > slotStart;
    });
  }

  async function loadBookings(value: DateValue | undefined, notify = true) {
    currentlySelectedDate = value;
    booked = [];
    if (!value || type !== "space") return;

    const date = toDateKey(value);
    if (notify) onDateChange?.(date);
    loading = true;
    try {
      booked = await spaces.findBookings(
        data.id,
        new TimeSpanClass({
          start: `${date}T00:00`,
          end: `${parseDate(date).add({ days: 1 })}T00:00`,
        }),
      );
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (currentlySelectedDate && type === "space") {
      void loadBookings(currentlySelectedDate, false).catch((error) =>
        console.error("Could not load space bookings:", error),
      );
    }
  });

  const getDayClass = (date: DateValue) =>
    isAvailableDay(date)
      ? "bg-green-light-fluro text-black border-black"
      : "pointer-events-none text-grey-medium-light";
</script>

<div class="overflow-hidden rounded-sm border border-black bg-grey-light">
  <h2
    class="border-b border-black bg-grey-medium px-3 py-2 text-center text-[20px] normal-case"
  >
    {title ?? `${type === "space" ? "Space" : "Resource"} Availability`}
  </h2>

  <Calendar
    type="single"
    variant="standard"
    bind:value={currentlySelectedDate}
    bind:placeholder={calendarPlaceholder}
    minValue={calendarDates?.start
      ? parseDate(toDateKey(calendarDates.start))
      : undefined}
    maxValue={calendarDates?.end
      ? parseDate(toDateKey(calendarDates.end))
      : undefined}
    onValueChange={(value) => loadBookings(value)}
    dayClass={getDayClass}
    dayAriaDisabled={(date) => !isAvailableDay(date) || undefined}
    dayAriaLabel={(date) =>
      `${toDateKey(date)} - ${isAvailableDay(date) ? "available" : "unavailable"}`}
  />

  {#if showSlots}
    {#if currentlySelectedDate}
      {@const selectedDateKey = toDateKey(currentlySelectedDate)}
      <div
        class="grid grid-cols-3 gap-1 border-t border-black bg-white p-2 sm:grid-cols-6"
      >
        {#each availabilityTimeSlots as slot (`${slot.start}-${slot.end}`)}
          {@const available = isSlotAvailable(
            selectedDateKey,
            slot.start,
            slot.end,
          )}
          {@const bookedSlot = isSlotBooked(
            selectedDateKey,
            slot.start,
            slot.end,
          )}
          <div
            class={`flex min-h-9 items-center justify-center rounded-sm border border-black px-1 text-center text-[14px] ${bookedSlot ? "bg-red-light" : available ? "bg-green-light-fluro" : "bg-grey-light text-grey-dark"}`}
            title={bookedSlot
              ? "Booked"
              : available
                ? "Available"
                : "Unavailable"}
          >
            {slot.start}
          </div>
        {/each}
      </div>
      <div
        class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-black bg-white px-3 py-2 text-[13px]"
        aria-label="Availability legend"
      >
        <span class="inline-flex items-center gap-1.5">
          <span
            class="size-3 rounded-sm border border-black bg-green-light-fluro"
          ></span>
          Available
        </span>
        {#if type === "space"}
          <span class="inline-flex items-center gap-1.5">
            <span class="size-3 rounded-sm border border-black bg-red-light"
            ></span>
            Booked
          </span>
        {/if}
        <span class="inline-flex items-center gap-1.5">
          <span class="size-3 rounded-sm border border-black bg-grey-light"
          ></span>
          Unavailable
        </span>
      </div>
      {#if loading}
        <p class="m-0 border-t border-black bg-white p-2 text-center">
          Checking bookings…
        </p>
      {/if}
    {:else}
      <p class="m-0 border-t border-black bg-white p-3 text-center">
        Select a date to see availability.
      </p>
    {/if}
  {/if}
</div>

{#if data.multiBookable}
  <p class="my-2 text-center text-[14px]">
    This {type} can have multiple bookings at the same time.
  </p>
{/if}
