<script lang="ts">
  const { selectedDate, timeSlots } = $props();

  let selectedTimeSlots = $state<string[]>([]);

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
      <button
        class={
          `time-slot py-2 px-4 cursor-pointer text-left
          ${!timeSlots.includes(timeSlot) ? 'text-gray-400 pointer-events-none' : ''}
          ${timeSlots.includes(timeSlot) ? 'bg-green-400' : ''}
          ${selectedTimeSlots.includes(timeSlot) ? 'border border-black' : ''}`
        }
        onclick={() => toggleSelection(timeSlot)}
        tabindex="0" 
        onkeydown={(event) => handleKeydown(event, timeSlot)} 
      >
        {timeSlot}
      </button>
    {/each}
  </div>
</div>

