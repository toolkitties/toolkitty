<script lang="ts">
	import { Calendar } from "bits-ui";
	import TimePicker from "./TimePicker.svelte";
	import type { DateValue } from "@internationalized/date";

	let { isReadOnly, canSelectMultiple, hasTimePicker, festivalDates = null, eventsCount = null } = $props();

	let selectedDate;
	let multipleSelectedDates;

	const handleDateSelect = (selection: DateValue[] | undefined): void => {
    if (canSelectMultiple) {
        multipleSelectedDates = selection ?? [];
    } else {
        selectedDate = selection ? selection[0] : null;
    }
};

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
								class={`data-[outside-month]:pointer-events-none
								  data-[outside-month]:text-gray-300
								  data-[selected]:bg-black
								  data-[selected]:text-white
								  ${isReadOnly && !isFestivalDate(date) ? 'text-gray-400 pointer-events-none' : ''}
								  ${isReadOnly && isFestivalDate(date) ? 'bg-black text-white font-bold' : ''}`}
							  />
							</Calendar.Cell>
						{/each}
					</Calendar.GridRow>
				{/each}
			</Calendar.GridBody>
		</Calendar.Grid>
	{/each}
</Calendar.Root>

{#if hasTimePicker}
  <TimePicker />
{/if}
