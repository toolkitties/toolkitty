<script lang="ts">
  import { Calendar } from "bits-ui";

  let selectMultiple: boolean = $props();
</script>

<Calendar.Root type={selectMultiple ? "multiple" : "single"}>
  {#snippet children({ months, weekdays })}
    <Calendar.Header class="flex flex-row">
      <Calendar.PrevButton class="w-8 mr-2">←</Calendar.PrevButton>
      <Calendar.Heading />
      <Calendar.NextButton class="w-8 ml-2">→</Calendar.NextButton>
    </Calendar.Header>

    {#each months as month (month.value)}
      <Calendar.Grid>
        <Calendar.GridHead>
          <Calendar.GridRow>
            {#each weekdays as day (day)}
              <Calendar.HeadCell>
                {day}
              </Calendar.HeadCell>
            {/each}
          </Calendar.GridRow>
        </Calendar.GridHead>
        <Calendar.GridBody>
          {#each month.weeks as weekDates, i (i)}
            <Calendar.GridRow>
              {#each weekDates as date (date)}
                <Calendar.Cell {date} month={month.value}>
                  <Calendar.Day
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
  {/snippet}
</Calendar.Root>
