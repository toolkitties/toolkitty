<script lang="ts">
	import { Calendar } from "bits-ui";
	let { canSelectMultiple } = $props();
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
									class="data-[outside-month]:pointer-events-none data-[outside-month]:text-[#d3d3d3] data-[selected]:bg-black data-[selected]:text-white"
								/>
							</Calendar.Cell>
						{/each}
					</Calendar.GridRow>
				{/each}
			</Calendar.GridBody>
		</Calendar.Grid>
	{/each}
</Calendar.Root>