<script lang="ts">
	import { Calendar } from "bits-ui";
	import TimePicker from "./TimePicker.svelte";
	import type { DateValue } from "@internationalized/date";

	let { isReadOnly, canSelectMultiple, hasTimePicker, festivalDates = null } = $props();

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
</script>

<Calendar.Root 
	let:months 
	let:weekdays
	multiple={canSelectMultiple}
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
									class={`data-[outside-month]:pointer-events-none 
										data-[outside-month]:text-gray-300 
										data-[selected]:bg-black 
										data-[selected]:text-white
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
