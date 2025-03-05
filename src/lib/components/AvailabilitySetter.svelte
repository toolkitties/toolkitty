<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import { writable, get } from "svelte/store";

  export let availability: {
    date: string;
    startTime: string;
    endTime: string;
  }[] = [];
  export let onUpdateAvailability: (
    newAvailability: typeof availability,
  ) => void;

  const availabilityStore = writable(availability);
  export const availableDates = writable<Set<string>>(
    new Set(availability.map((entry) => entry.date)),
  );

  let currentlySelectedDate: DateValue | undefined = undefined;

  const handleDateSelect = (value: DateValue | undefined) => {
    currentlySelectedDate = value || undefined;
  };

  const handleAddAvailability = () => {
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

    const newEntry = { date: selectedDate, startTime, endTime };

    availabilityStore.update((current) => {
      const updatedAvailability = [...current, newEntry];
      onUpdateAvailability(updatedAvailability);
      return updatedAvailability;
    });

    availableDates.update((dates) => new Set([...dates, selectedDate]));

    alert("Availability added successfully!");
  };

  const handleRemoveAvailability = (index: number) => {
    availabilityStore.update((current) => {
      const removedDate = current[index].date;
      const updatedAvailability = current.filter((_, i) => i !== index);

      availableDates.update((dates) => {
        const updatedDates = new Set(dates);
        if (!updatedAvailability.some((entry) => entry.date === removedDate)) {
          updatedDates.delete(removedDate);
        }
        return updatedDates;
      });

      onUpdateAvailability(updatedAvailability);
      return updatedAvailability;
    });
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
                <Calendar.Cell {date} month={month.value}>
                  <Calendar.Day
                    class={"data-[outside-month]:pointer-events-none data-[outside-month]:text-gray-300 data-[selected]:bg-black data-[selected]:text-white " +
                      (get(availableDates).has(date.toString())
                        ? "bg-green-500 text-white"
                        : "")}
                    aria-label={"Date " +
                      date.toString() +
                      (get(availableDates).has(date.toString())
                        ? " - Availability set"
                        : " - No availability")}
                    title={get(availableDates).has(date.toString())
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

{#if currentlySelectedDate && !get(availableDates).has(currentlySelectedDate.toString())}
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
  <button on:click={handleAddAvailability}>Add</button>
{/if}

{#if get(availabilityStore).length > 0}
  <h3>Current Availability:</h3>
  <ul>
    {#each get(availabilityStore) as entry, index}
      {#if entry.date === currentlySelectedDate?.toString()}
        <li>
          <span>{entry.startTime} - {entry.endTime}</span>
          <button on:click={() => handleRemoveAvailability(index)}
            >Remove</button
          >
        </li>
      {/if}
    {/each}
  </ul>
{/if}
