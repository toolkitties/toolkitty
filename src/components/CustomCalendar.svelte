<script lang="ts">
	import { Calendar } from "bits-ui";
	import TimePicker from "../components/TimePicker.svelte";
	import { writable } from 'svelte/store';
	import type { DateValue } from "@internationalized/date";
  
	let { 
	  use,
	  canSelectMultiple, 
	  hasTimePicker, 
	  festivalDates = null, 
	  eventsCount = null, 
	  availableDates = null,
	  availableTimes = null,
	} = $props();
	
	const selectedDate = writable<DateValue | undefined>(undefined); // pass to time picker, emit to home page
	const multipleSelectedDates = writable<DateValue[] | DateValue | undefined>(undefined); // festival dates, send to db
  
	interface TimeEntry {
	  date: DateValue;
	  times: string[];
	}
  
	let availableTimesForSelectedDate = writable<string[]>([]);
  
	// pass date selections to writable store
	// check if selected date has associated available times to pass to time picker
	const handleDateSelect = (selection: DateValue[] | DateValue | undefined): void => {
	  if (Array.isArray(selection)) {
		multipleSelectedDates.set(selection);
	  } else {
		selectedDate.set(selection);
		if (selection && availableTimes) {
		  findAvailableTimesForSelectedDate(selection, availableTimes);
		} else {
		  availableTimesForSelectedDate.set([]); 
		}
	  }
	};
  
	// Pull available times array for selected date
	function findAvailableTimesForSelectedDate(date: DateValue, times: TimeEntry[]) {
	  const matchingEntry = times.find(entry => 
		date.year === entry.date.year && 
		date.month === entry.date.month && 
		date.day === entry.date.day
	  );
	  if (matchingEntry) {
		availableTimesForSelectedDate.set(matchingEntry.times);
	  } else {
		availableTimesForSelectedDate.set([]); 
	  }
	}
  
	// Functions to handle how day cells are styled and interacted with
	const isFestivalDate = (date: DateValue): boolean => {
	  if (!festivalDates || !Array.isArray(festivalDates)) {
		return false;
	  }
	  return festivalDates.some(festivalDate => isSameDate(festivalDate, date));
	};
  
	const isSameDate = (date1: DateValue, date2: DateValue): boolean => {
	  return (
		date1.calendar.identifier === date2.calendar.identifier &&
		date1.year === date2.year &&
		date1.month === date2.month &&
		date1.day === date2.day
	  );
	};
  
	const getOpacity = (date: DateValue): number => {
	  if (!eventsCount || !Array.isArray(eventsCount)) {
		return 1;
	  }
	  const eventForDate = eventsCount.find(event => isSameDate(event.date, date));
	  if (eventForDate) {
		return Math.min(0.2 + eventForDate.numberOfEvents * 0.2, 1);
	  }
	  return 1; 
	};
  
	const isAvailableDate = (date: DateValue): boolean => {
	  return availableDates && availableDates.some((d: DateValue) => isSameDate(d, date));
	};
  </script>  
  
  <Calendar.Root 
	let:months 
	let:weekdays
	multiple={canSelectMultiple}
	onValueChange={handleDateSelect}
  >
	<Calendar.Header>
	  <Calendar.PrevButton>←</Calendar.PrevButton>
	  <Calendar.Heading />
	  <Calendar.NextButton>→</Calendar.NextButton>
	</Calendar.Header>
  
	{#each months as month}
	  <Calendar.Grid>
		<Calendar.GridHead>
		  <Calendar.GridRow>
			{#each weekdays as day}
			  <Calendar.HeadCell>
				{day}
			  </Calendar.HeadCell>
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
					style={`opacity: ${getOpacity(date)}`}
					class={
						`data-[outside-month]:pointer-events-none
						data-[outside-month]:text-gray-300
						data-[selected]:bg-black
						data-[selected]:text-white
						${use === "festival overview" && !isFestivalDate(date) ? 'text-gray-400 pointer-events-none' : ''}
						${use === "festival overview" && isFestivalDate(date) ? 'bg-black text-white font-bold' : ''}
						${use === "resource management" && isAvailableDate(date) ? 'bg-green-300' : ''}
						${use === "resource management" && !isAvailableDate(date) ? 'text-gray-400 pointer-events-none' : ''}`
					}
				  />
				</Calendar.Cell>
			  {/each}
			</Calendar.GridRow>
		  {/each}
		</Calendar.GridBody>
	  </Calendar.Grid>
	{/each}
  </Calendar.Root>
  
  {#if hasTimePicker && $selectedDate}
  <TimePicker 
    selectedDate={$selectedDate} 
    availableTimes={$availableTimesForSelectedDate}
  />
{/if}
