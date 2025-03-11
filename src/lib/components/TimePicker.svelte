<script lang="ts">
  const { selectedDate, availableTimes } = $props();

  // create time slots array
  let timeSlots: string[] = [];
  for (let i = 0; i < 24; i++) {
    let hourStart = String(i).padStart(2, "0");
    let hourEnd = String((i + 1) % 24).padStart(2, "0");
    timeSlots.push(`${hourStart}:00 - ${hourEnd}:00`);
  }

  // select / unselect
  let selectedTimeSlots = $state<string[]>([]);

  function toggleSelection(timeSlot: string) {
    if (selectedTimeSlots.includes(timeSlot)) {
      selectedTimeSlots = selectedTimeSlots.filter((item) => item !== timeSlot);
    } else {
      selectedTimeSlots = [...selectedTimeSlots, timeSlot];
    }
  }

  function handleKeydown(event: KeyboardEvent, timeSlot: string) {
    if (event.key === "Enter" || event.key === " ") {
      toggleSelection(timeSlot);
    }
  }
</script>

<p>Select time slots:</p>
<h2>{selectedDate}</h2>
<div class="w-64">
  <div class="overflow-y-auto max-h-48 border border-gray-300 rounded-lg">
    {#each timeSlots as timeSlot (timeSlot)}
      <button
        class={`time-slot py-2 px-4 cursor-pointer text-left
          ${!availableTimes.includes(timeSlot) ? "text-gray-400 pointer-events-none" : ""}
          ${availableTimes.includes(timeSlot) ? "bg-green-400" : ""}
          ${selectedTimeSlots.includes(timeSlot) ? "border border-black" : ""}`}
        onclick={() => toggleSelection(timeSlot)}
        tabindex="0"
        onkeydown={(event) => handleKeydown(event, timeSlot)}
      >
        {timeSlot}
      </button>
    {/each}
  </div>
</div>
