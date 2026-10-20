<!--
 @component
 Set availability of a space or resource with a calendar and 30-minute slots.

 Used in space/resource create or edit forms.
-->

<script lang="ts">
  import { parseDate, type DateValue } from "@internationalized/date";
  import Calendar from "$lib/components/Calendar.svelte";
  import ChevronIcon from "$lib/components/icons/ChevronIcon.svelte";
  import {
    availabilityTimeSlots as timeSlots,
    slotDateTime,
  } from "$lib/utils/availabilitySlots";

  let {
    availability = $bindable(),
    calendarDates,
    allSelected = false,
    currentlySelectedDate = $bindable(
      parseDate(calendarDates.start.split("T")[0]),
    ),
  }: {
    availability: TimeSpan[];
    calendarDates: TimeSpan;
    allSelected?: boolean;
    currentlySelectedDate?: DateValue;
  } = $props();

  const toDateKey = (value: string | DateValue) =>
    value.toString().split("T")[0];

  const toTimeKey = (value: string) =>
    value.includes("T") ? value.split("T")[1].slice(0, 5) : "";

  const programmeStart = toDateKey(calendarDates.start);
  let calendarPlaceholder: DateValue = $state(parseDate(programmeStart));
  let slotsOpen = $state(true);

  let availableDateKeys = $derived(
    new Set(availability.map((entry) => toDateKey(entry.start))),
  );

  function isDateInRange(date: DateValue): boolean {
    const dateKey = toDateKey(date);
    const endDate = calendarDates.end
      ? toDateKey(calendarDates.end)
      : undefined;

    return dateKey >= programmeStart && (!endDate || dateKey <= endDate);
  }

  function isSlotSelected(date: string, start: string, end: string): boolean {
    if (allSelected) return true;

    return availability.some(
      (entry) =>
        toDateKey(entry.start) === date &&
        toTimeKey(entry.start) === start &&
        entry.end.slice(0, 16) === slotDateTime(date, end),
    );
  }

  function toggleSlot(start: string, end: string) {
    if (!currentlySelectedDate || allSelected) return;

    const date = toDateKey(currentlySelectedDate);
    const existingIndex = availability.findIndex(
      (entry) =>
        toDateKey(entry.start) === date &&
        toTimeKey(entry.start) === start &&
        entry.end.slice(0, 16) === slotDateTime(date, end),
    );

    if (existingIndex >= 0) {
      availability = availability.filter((_, index) => index !== existingIndex);
      return;
    }

    availability = [
      ...availability,
      {
        start: `${date}T${start}`,
        end: slotDateTime(date, end),
      },
    ].sort((a, b) => a.start.localeCompare(b.start));
  }

  const getDayClass = (date: DateValue) =>
    `${(allSelected && isDateInRange(date)) || availableDateKeys.has(toDateKey(date)) ? "bg-green-light-fluro text-black border-black" : ""}
     ${!isDateInRange(date) ? "pointer-events-none text-grey-medium-light" : ""}`;
</script>

<div class="bg-grey-light">
  <Calendar
    type="single"
    variant="standard"
    bind:value={currentlySelectedDate}
    bind:placeholder={calendarPlaceholder}
    dayClass={getDayClass}
    dayAriaDisabled={(date) => !isDateInRange(date) || undefined}
    dayAriaLabel={(date) =>
      `Date ${toDateKey(date)}${allSelected || availableDateKeys.has(toDateKey(date)) ? " - availability set" : ""}`}
    dayTitle={(date) =>
      allSelected || availableDateKeys.has(toDateKey(date))
        ? "Availability set"
        : "No availability"}
  />

  <button
    type="button"
    aria-expanded={slotsOpen}
    class="flex w-full items-center justify-between rounded-none border-x-0 border-b-0 border-t border-black bg-grey-medium px-2 py-2 text-[20px] leading-none"
    onclick={() => (slotsOpen = !slotsOpen)}
  >
    <span>Time slots (select)</span>
    <span
      class={`transition-transform duration-200 ${slotsOpen ? "rotate-180" : ""}`}
    >
      <ChevronIcon size={16} />
    </span>
  </button>

  {#if slotsOpen}
    {#if currentlySelectedDate}
      <div class="max-h-[400px] overflow-y-auto bg-white">
        {#each timeSlots as slot (`${slot.start}-${slot.end}`)}
          <button
            type="button"
            aria-pressed={isSlotSelected(
              toDateKey(currentlySelectedDate),
              slot.start,
              slot.end,
            )}
            class={`h-[40px] w-full justify-center rounded-none border-0 border-b border-grey-medium-light px-2 py-1 text-[1.35rem] leading-tight ${isSlotSelected(toDateKey(currentlySelectedDate), slot.start, slot.end) ? "bg-green-light-fluro" : "bg-white"}`}
            onclick={() => toggleSlot(slot.start, slot.end)}
          >
            {slot.start} - {slot.end}
          </button>
        {/each}
      </div>
    {:else}
      <p class="m-0 bg-white p-3 text-center text-[1.35rem]">
        Select a date first.
      </p>
    {/if}
  {/if}
</div>
