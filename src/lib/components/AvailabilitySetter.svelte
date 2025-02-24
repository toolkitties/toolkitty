<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import { writable } from "svelte/store";

  export const availableDates = writable<Set<string>>(new Set());

  let dateSelected = false;
  let currentlySelectedDate: DateValue | null = null;
  let availability: { date: DateValue; startTime: string; endTime: string }[] =
    [];

  const handleDateSelect = (value: DateValue | DateValue[] | undefined) => {
    if (!value || Array.isArray(value)) {
      dateSelected = false;
      currentlySelectedDate = null;
      return;
    }

    dateSelected = true;
    currentlySelectedDate = value;
  };

  const handleAddAvailability = () => {
    if (!currentlySelectedDate) {
      alert("Please select a single date first.");
      return;
    }

    const selectedDate = currentlySelectedDate;

    const startTimeInput = document.querySelector<HTMLInputElement>(
      'input[name="availability-start-time"]',
    );
    const endTimeInput = document.querySelector<HTMLInputElement>(
      'input[name="availability-end-time"]',
    );

    if (!startTimeInput || !endTimeInput) {
      console.log("Time inputs not found.");
      return;
    }

    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    if (!startTime || !endTime) {
      alert("Please enter both start and end times.");
      return;
    }

    const newAvailability = { date: selectedDate, startTime, endTime };

    availability = [...availability, newAvailability];

    availableDates.update((dates) => {
      const updatedDates = new Set(dates);
      updatedDates.add(selectedDate.toString());
      return updatedDates;
    });
  };

  const handleRemoveAvailability = (index: number) => {
    const removedDate = availability[index].date.toString();
    availability = availability.filter((_, i) => i !== index);

    availableDates.update((dates) => {
      const updatedDates = new Set(dates);
      if (
        !availability.some((entry) => entry.date.toString() === removedDate)
      ) {
        updatedDates.delete(removedDate);
      }
      return updatedDates;
    });
  };
</script>

<Calendar.Root let:months let:weekdays onValueChange={handleDateSelect}>
  <Calendar.Header class="flex flex-row">
    <Calendar.PrevButton class="w-8 mr-2">←</Calendar.PrevButton>
    <Calendar.Heading />
    <Calendar.NextButton class="w-8 ml-2">→</Calendar.NextButton>
  </Calendar.Header>

  {#each months as month}
    <Calendar.Grid>
      <Calendar.GridHead>
        <Calendar.GridRow>
          {#each weekdays as day}
            <Calendar.HeadCell>{day}</Calendar.HeadCell>
          {/each}
        </Calendar.GridRow>
      </Calendar.GridHead>
      <Calendar.GridBody>
        {#each month.weeks as weekDates}
          <Calendar.GridRow>
            {#each weekDates as date}
              <Calendar.Cell {date}>
                <Calendar.Day
                  {date}
                  month={month.value}
                  class={"data-[outside-month]:pointer-events-none data-[outside-month]:text-gray-300 data-[selected]:bg-black data-[selected]:text-white " +
                    ($availableDates.has(date.toString())
                      ? "bg-green-500 text-white"
                      : "")}
                  aria-label={"Date " +
                    date.toString() +
                    ($availableDates.has(date.toString())
                      ? " - Availability set"
                      : " - No availability")}
                  title={$availableDates.has(date.toString())
                    ? "Availability set"
                    : "No availability"}
                />
              </Calendar.Cell>
            {/each}
          </Calendar.GridRow>
        {/each}
      </Calendar.GridBody>
    </Calendar.Grid>
  {/each}
</Calendar.Root>

{#if dateSelected && currentlySelectedDate}
  {#if !$availableDates.has(currentlySelectedDate.toString())}
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
    <button
      on:click={handleAddAvailability}
      class="bg-blue-500 text-white px-4 py-2 rounded"
    >
      Add
    </button>
  {/if}

  {#if availability.length > 0}
    <h3 class="mt-4">Current Availability:</h3>
    <ul>
      {#each availability as entry, index}
        {#if entry.date.toString() === currentlySelectedDate.toString()}
          <li class="flex items-center space-x-4 mt-2">
            <span>{entry.startTime} - {entry.endTime}</span>
            <button
              on:click={() => handleRemoveAvailability(index)}
              class="bg-red-500 text-white px-2 py-1 rounded"
            >
              Remove
            </button>
          </li>
        {/if}
      {/each}
    </ul>
  {/if}
{/if}
