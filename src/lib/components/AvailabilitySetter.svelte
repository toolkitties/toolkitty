<!-- 
 @component
 Set availability of a space or resource.
 
 Used in space/resource create or edit forms.
  -->

<script lang="ts">
  import type { DateValue } from "@internationalized/date";
  import Calendar from "$lib/components/Calendar.svelte";

  let {
    availability = $bindable(),
    calendarDates,
  }: {
    availability: TimeSpan[];
    calendarDates: TimeSpan;
  } = $props();

  // used to color available dates in the calendar
  let availableDates: { date: string }[] = $state(
    availability.length > 0
      ? availability.map((a) => {
          return { date: a.start.split("T")[0] };
        })
      : [],
  );

  // Keep a list of availability as destructured strings to show to user
  let availabilityList: { date: string; startTime: string; endTime: string }[] =
    $state(
      availability.length > 0
        ? availability.map((a) => ({
            date: a.start.split("T")[0],
            startTime: a.start.split(" ")[0],
            endTime: a.end ? a.end.split(" ")[0] : "",
          }))
        : [],
    );

  // Disable any calendar dates not inside calendar dates
  const isDateInRange = (date: DateValue, range: TimeSpan) => {
    const dateStr = date.toString();
    const startDate = range.start.split("T")[0];
    const endDate = range.end ? range.end.split("T")[0] : undefined;

    // If there is no end date, allow all dates after the start date
    return dateStr >= startDate && (endDate ? dateStr <= endDate : true);
  };

  let currentlySelectedDate: DateValue | undefined = $state(undefined);

  const handleDateSelect = (value: DateValue | undefined) => {
    currentlySelectedDate = value || undefined;
  };

  const isAvailable = (date: DateValue) =>
    availableDates.some((availableDate) => availableDate.date === date.toString());

  const getDayClass = (date: DateValue) =>
    (isAvailable(date) ? "bg-green-500 text-white" : "") +
    (!isDateInRange(date, calendarDates)
      ? " pointer-events-none text-gray-400"
      : "");

  const getDayAriaDisabled = (date: DateValue) =>
    !isDateInRange(date, calendarDates) || undefined;

  const getDayAriaLabel = (date: DateValue) =>
    "Date " + date.toString() + (isAvailable(date) ? " - Availability set" : " - No availability");

  const getDayTitle = (date: DateValue) =>
    isAvailable(date) ? "Availability set" : "No availability";

  let endTimeError: boolean = $state(false);
  const handleAddAvailability = (e: Event) => {
    e.preventDefault();
    if (!currentlySelectedDate) {
      alert("Please select a date first.");
      return;
    }

    const selectedDate = currentlySelectedDate.toString();
    const startTimeInput = document.querySelector<HTMLInputElement>(
      'input[name="availability-start-time"]',
    );
    const endTimeInput = document.querySelector<HTMLInputElement>(
      'input[name="availability-end-time"]',
    );

    if (!startTimeInput || !endTimeInput) return;

    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    if (startTime >= endTime) {
      endTimeError = true;
      return;
    }

    let newAvailabilityListEntry = {
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
    };

    // Convert to TimeSpan for form submission
    const newTimeSpan: TimeSpan = {
      start: selectedDate + "T" + startTime,
      end: selectedDate + "T" + endTime,
    };

    availability = [...availability, newTimeSpan];
    availabilityList = [...availabilityList, newAvailabilityListEntry];
    availableDates = [...availableDates, { date: selectedDate }];
  };

  const handleRemoveAvailability = (e: Event, index: number) => {
    e.preventDefault();
    availability = availability.filter((_: TimeSpan, i: number) => i !== index);
    availabilityList = availabilityList.filter(
      (_: { date: string; startTime: string; endTime: string }, i) =>
        i !== index,
    );
    availableDates = availableDates.filter(
      (_: { date: string }, i) => i !== index,
    );
  };
</script>

<Calendar
  type="single"
  bind:value={currentlySelectedDate}
  onValueChange={handleDateSelect}
  dayClass={getDayClass}
  dayAriaDisabled={getDayAriaDisabled}
  dayAriaLabel={getDayAriaLabel}
  dayTitle={getDayTitle}
/>
{#if availabilityList.length > 0}
  <h3>Current Availability:</h3>
  <ul>
    {#each availabilityList as entry, index (entry.date + entry.startTime + entry.endTime)}
      <li>
        <span>{entry.date}: {entry.startTime} - {entry.endTime}</span>
        <button onclick={(e: Event) => handleRemoveAvailability(e, index)}
          >Remove</button
        >
      </li>
    {/each}
  </ul>
{/if}

{#if currentlySelectedDate && !availableDates.some((d) => d.date === currentlySelectedDate!.toString())}
  <p>
    What time is the space available on {currentlySelectedDate?.toString() ||
      ""}?
  </p>
  <div class="flex flex-row space-x-2">
    <label for="availability-start-time">Start *</label>
    <input name="availability-start-time" type="time" required />
    <label for="availability-end-time">End *</label>
    <input
      name="availability-end-time"
      type="time"
      required
      onfocus={() => {
        const startTimeInput = document.querySelector<HTMLInputElement>(
          'input[name="availability-start-time"]',
        );
        const endTimeInput = document.querySelector<HTMLInputElement>(
          'input[name="availability-end-time"]',
        );

        if (startTimeInput && endTimeInput && !endTimeInput.value) {
          endTimeInput.value = startTimeInput.value;
        }
      }}
    />
    {#if endTimeError}
      <!-- temporary way to show availability form errors to user -->
      <span class="form-error">End time must be later than start time.</span>
    {/if}
  </div>
  <button onclick={(e: Event) => handleAddAvailability(e)}>Add</button>
{/if}
