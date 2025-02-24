<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";

  let dateSelected = false;
  let currentlySelectedDate: DateValue | DateValue[] | undefined;
  let availability: { date: DateValue; startTime: string; endTime: string }[] =
    [];

  const handleDateSelect = (value: DateValue | DateValue[] | undefined) => {
    dateSelected = true;

    if (!value) {
      dateSelected = false;
    }

    currentlySelectedDate = value;
  };

  const handleAddAvailability = () => {
    if (!currentlySelectedDate || Array.isArray(currentlySelectedDate)) {
      alert("Please select a single date first.");
      return;
    }

    const startTimeInput = document.querySelector<HTMLInputElement>(
      'input[name="availability-start-time"]',
    );
    const endTimeInput = document.querySelector<HTMLInputElement>(
      'input[name="availability-end-time"]',
    );

    if (!startTimeInput || !endTimeInput) {
      alert("Time inputs not found.");
      return;
    }

    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    if (!startTime || !endTime) {
      alert("Please enter both start and end times.");
      return;
    }

    const newAvailability = {
      date: currentlySelectedDate,
      startTime,
      endTime,
    };

    availability = [...availability, newAvailability];

    console.log("Updated Availability:", availability);
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
                  class={`data-[outside-month]:pointer-events-none
                              data-[outside-month]:text-gray-300
                              data-[selected]:bg-black
                              data-[selected]:text-white`}
                />
              </Calendar.Cell>
            {/each}
          </Calendar.GridRow>
        {/each}
      </Calendar.GridBody>
    </Calendar.Grid>
  {/each}
</Calendar.Root>

{#if dateSelected}
  <p>What time is the space available on {currentlySelectedDate}?</p>
  <div class="flex flex-row">
    <label for="availability-start-time">Start *</label>
    <input name="availability-start-time" type="time" required />
    <label for="availability-end-time">End *</label>
    <input name="availability-end-time" type="time" required />
  </div>
  <button onclick={handleAddAvailability}>add</button>
{/if}
<br />
<br />
<br />
