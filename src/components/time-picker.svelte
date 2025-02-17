<script lang="ts">
  const { selectedDate, availableTimeSlots } = $props();

  // create time slots array
  let timeSlots: string[] = [];
  for (let i = 0; i < 24; i++) {
    let hourStart = String(i).padStart(2, "0");
    let hourEnd = String((i + 1) % 24).padStart(2, "0");
    timeSlots.push(`${hourStart}:00 - ${hourEnd}:00`);
  }

  let selectedTimeSlots = $state<string[]>([]);

  function toggleSelection(timeSlot: string, event: Event) {
    event.preventDefault();

    if (selectedTimeSlots.includes(timeSlot)) {
      selectedTimeSlots = selectedTimeSlots.filter((item) => item !== timeSlot);
    } else {
      selectedTimeSlots = [...selectedTimeSlots, timeSlot];
    }
  }

  function handleKeydown(event: KeyboardEvent, timeSlot: string) {
    if (event.key === "Enter" || event.key === " ") {
      toggleSelection(timeSlot, event);
    }
  }
</script>

<p>Select from available times (including set-up):</p>
<h2>{selectedDate}</h2>
<div class="w-64">
  <div class="overflow-y-auto max-h-48 border border-gray-300 rounded-lg">
    {#each timeSlots as timeSlot}
      <button
        type="button"
        style={selectedTimeSlots.includes(timeSlot)
          ? "border: 1px solid black;"
          : ""}
        class={`time-slot py-2 px-4 cursor-pointer text-left border-none
          ${!availableTimeSlots.includes(timeSlot) ? "text-gray-400 pointer-events-none" : ""}
          ${availableTimeSlots.includes(timeSlot) ? "bg-green-400" : ""}
          `}
        onclick={(event) => toggleSelection(timeSlot, event)}
        tabindex="0"
        onkeydown={(event) => handleKeydown(event, timeSlot)}
      >
        {timeSlot}
      </button>
    {/each}
  </div>
</div>
