<!-- 
 
Date Input component
≧〔゜゜〕≦
This component takes in an ISO8601 string and
has a bindable date property that returns an ISO8601 string

-->
<script lang="ts">
  import { DatePicker } from "bits-ui";
  import { parseDate } from "@internationalized/date";
  import type { DateValue } from "@internationalized/date";

  let {
    date = $bindable(),
    minValue,
    maxValue,
  }: {
    date: string;
    minValue?: DateValue;
    maxValue?: DateValue;
  } = $props();

  let value: DateValue = $state(parseDate(date));

  function getValue() {
    return value;
  }

  /**
   * Update value and assign date to ISO string to be sent to parent
   */
  function setValue(newValue: DateValue) {
    value = newValue;
    date = newValue.toString();
  }
</script>

<DatePicker.Root bind:value={getValue, setValue} {minValue} {maxValue}>
  <DatePicker.Label />
  <DatePicker.Input>
    {#snippet children({ segments })}
      {#each segments as { part, value } (value)}
        <DatePicker.Segment {part}>
          {value}
        </DatePicker.Segment>
      {/each}
      <DatePicker.Trigger />
    {/snippet}
  </DatePicker.Input>
  <DatePicker.Content>
    <DatePicker.Calendar>
      {#snippet children({ months, weekdays })}
        <DatePicker.Header>
          <DatePicker.PrevButton />
          <DatePicker.Heading />
          <DatePicker.NextButton />
        </DatePicker.Header>
        {#each months as month (month.value)}
          <DatePicker.Grid>
            <DatePicker.GridHead>
              <DatePicker.GridRow>
                {#each weekdays as day (day)}
                  <DatePicker.HeadCell>
                    {day}
                  </DatePicker.HeadCell>
                {/each}
              </DatePicker.GridRow>
            </DatePicker.GridHead>
            <DatePicker.GridBody>
              {#each month.weeks as weekDates (weekDates)}
                <DatePicker.GridRow>
                  {#each weekDates as date (date)}
                    <DatePicker.Cell {date} month={month.value}>
                      <DatePicker.Day />
                    </DatePicker.Cell>
                  {/each}
                </DatePicker.GridRow>
              {/each}
            </DatePicker.GridBody>
          </DatePicker.Grid>
        {/each}
      {/snippet}
    </DatePicker.Calendar>
  </DatePicker.Content>
</DatePicker.Root>
