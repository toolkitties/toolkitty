<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";

  let { availability = $bindable() } = $props<{
    availability: TimeSpan[];
  }>();

  // used to color available dates in the calendar
  let availableDates: { date: string }[] = $state([]);

  // Keep a list of availability as destructured strings to show to user
  let availabilityList: { date: string; startTime: string; endTime: string }[] =
    $state([]);

  let currentlySelectedDate: DateValue | undefined = $state(undefined);

  const handleDateSelect = (value: DateValue | undefined) => {
    currentlySelectedDate = value || undefined;
  };

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

    if (!startTime || !endTime) {
      alert("Please enter both start and end times.");
      return;
    }

    if (startTime >= endTime) {
      alert("End time must be later than start time.");
      return;
    }

    let newAvailabilityListEntry = {
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
    };

    // Convert to TimeSpan for form submission
    const newTimeSpan: TimeSpan = {
      start: new Date(selectedDate + "T" + startTime),
      end: new Date(selectedDate + "T" + endTime),
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

<Calendar.Root
  type="single"
  bind:value={currentlySelectedDate}
  onValueChange={handleDateSelect}
>
  {#snippet children({ months, weekdays })}
    <Calendar.Header class="flex flex-row">
      <Calendar.PrevButton class="w-8 mr-2">←</Calendar.PrevButton>
      <Calendar.Heading />
      <Calendar.NextButton class="w-8 ml-2">→</Calendar.NextButton>
    </Calendar.Header>

    {#each months as month (month.value)}
      <Calendar.Grid>
        <Calendar.GridHead>
          <Calendar.GridRow>
            {#each weekdays as day, i ("day" + i)}
              <Calendar.HeadCell>{day}</Calendar.HeadCell>
            {/each}
          </Calendar.GridRow>
        </Calendar.GridHead>
        <Calendar.GridBody>
          {#each month.weeks as weekDates, i ("weekDates" + i)}
            <Calendar.GridRow>
              {#each weekDates as date (date)}
                <Calendar.Cell {date} month={month.value}>
                  <Calendar.Day
                    class={"data-[outside-month]:pointer-events-none data-[outside-month]:text-gray-300 data-[selected]:bg-black data-[selected]:text-white " +
                      (availableDates.some((d) => d.date === date.toString())
                        ? "bg-green-500 text-white"
                        : "")}
                    aria-label={"Date " +
                      date.toString() +
                      (availableDates.some((d) => d.date === date.toString())
                        ? " - Availability set"
                        : " - No availability")}
                    title={availableDates.some(
                      (d) => d.date === date.toString(),
                    )
                      ? "Availability set"
                      : "No availability"}
                    aria-disabled={"outside-month" in date}
                  />
                </Calendar.Cell>
              {/each}
            </Calendar.GridRow>
          {/each}
        </Calendar.GridBody>
      </Calendar.Grid>
    {/each}
  {/snippet}
</Calendar.Root>
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
    <input name="availability-end-time" type="time" required />
  </div>
  <button onclick={(e: Event) => handleAddAvailability(e)}>Add</button>
{/if}

{#if availability.length > 0}
  <h3>Current Availability:</h3>
  <ul>
    {#each availability as entry, index (entry)}
      {#if entry.date === currentlySelectedDate?.toString()}
        <li>
          <span>{entry.startTime} - {entry.endTime}</span>
          <button onclick={(e: Event) => handleRemoveAvailability(e, index)}
            >Remove</button
          >
        </li>
      {/if}
    {/each}
  </ul>
{/if}
