<script lang="ts">
    let { selectedDate } = $props();

    let timeSlots: string[] = [];
    for (let i = 0; i < 24; i++) {
      let hourStart = String(i).padStart(2, '0');
      let hourEnd = String((i + 1) % 24).padStart(2, '0');
      timeSlots.push(`${hourStart}:00 - ${hourEnd}:00`);
    }
  
    let selectedTimeSlots: string[] = $state([]);
  
    function toggleSelection(timeSlot: string) {
      if (selectedTimeSlots.includes(timeSlot)) {
        selectedTimeSlots = selectedTimeSlots.filter(item => item !== timeSlot);
      } else {
        selectedTimeSlots = [...selectedTimeSlots, timeSlot];
      }
    }
  
    function handleKeydown(event: KeyboardEvent, timeSlot: string) {
      if (event.key === 'Enter' || event.key === ' ') {
        toggleSelection(timeSlot);
      }
    }
  </script>
  
  <p>Select time slots:</p>
  <h2>{ selectedDate }</h2>
  <div class="w-64">
    <div class="overflow-y-auto max-h-48 border border-gray-300 rounded-lg">
      {#each timeSlots as timeSlot}
        <div
          role="button" 
          class="time-slot py-2 px-4 cursor-pointer text-left transition-colors duration-300 ease-in-out hover:bg-gray-100"
          class:selected={selectedTimeSlots.includes(timeSlot)}
          onclick={() => toggleSelection(timeSlot)}
          tabindex="0" 
          onkeydown={(event) => handleKeydown(event, timeSlot)} 
        >
          {timeSlot}
        </div>
      {/each}
    </div>
  </div>
  
  <style>
    .time-slot.selected {
      background-color: black; 
      color: white;
    }
  </style>
  