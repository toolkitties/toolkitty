<!-- 
 @component
 Generic date picker component
 Takes in an ISO8601 UTC string and
 has a bindable value property that returns an ISO8601 UTC string

 If no value is provided on mount then we get the current time in users timezone (set to start of the hour for nicer UX)
-->
<script lang="ts">
  import { DatePicker } from "bits-ui";
  import {
    parseAbsoluteToLocal,
    now,
    getLocalTimeZone,
  } from "@internationalized/date";
  import { ZonedDateTime, type DateValue } from "@internationalized/date";
  import CalendarIcon from "../icons/CalendarIcon.svelte";

  function startOfHour(date: ZonedDateTime): ZonedDateTime {
    return date.set({
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  }

  let {
    value = $bindable(),
    label,
    minValue,
    maxValue,
  }: {
    value?: string;
    label: string;
    minValue?: DateValue;
    maxValue?: DateValue;
  } = $props();

  let date: ZonedDateTime = $state(
    value ? parseAbsoluteToLocal(value) : startOfHour(now(getLocalTimeZone())),
  );

  function getDate() {
    return date;
  }

  /**
   * Update value and assign date to ISO string to be sent to parent
   */
  function setDate(newDate: ZonedDateTime) {
    date = newDate;
    value = newDate.toAbsoluteString();
  }
</script>

<DatePicker.Root
  granularity="minute"
  hourCycle={24}
  bind:value={getDate, setDate}
  {minValue}
  {maxValue}
>
  <div class="flex w-full flex-col gap-1.5">
    <DatePicker.Label>{label}</DatePicker.Label>
    <DatePicker.Input>
      {#snippet children({ segments })}
        {#each segments as { part, value }, i (i + "snippet")}
          <div class="inline-block select-none">
            {#if part === "literal"}
              <DatePicker.Segment {part} class="text-muted-foreground p-1">
                {value}
              </DatePicker.Segment>
            {:else}
              <DatePicker.Segment
                {part}
                class="rounded-5px hover:bg-muted focus:bg-muted focus:text-foreground aria-[valuetext=Empty]:text-muted-foreground focus-visible:ring-0! focus-visible:ring-offset-0! px-1 py-1"
              >
                {value}
              </DatePicker.Segment>
            {/if}
          </div>
        {/each}
        <DatePicker.Trigger
          class="text-foreground/60 hover:bg-muted active:bg-dark-10 ml-auto inline-flex size-8 items-center justify-center rounded-[5px] transition-all"
        >
          <CalendarIcon size={12} />
        </DatePicker.Trigger>
      {/snippet}
    </DatePicker.Input>
  </div>

  <DatePicker.Content class="bg-white">
    <DatePicker.Calendar>
      {#snippet children({ months, weekdays })}
        <DatePicker.Header class="flex flex-row">
          <DatePicker.PrevButton class="w-8 mr-2">←</DatePicker.PrevButton>
          <DatePicker.Heading />
          <DatePicker.NextButton class="w-8 ml-2">→</DatePicker.NextButton>
        </DatePicker.Header>
        {#each months as month (month.value)}
          <DatePicker.Grid>
            <DatePicker.GridHead>
              <DatePicker.GridRow>
                {#each weekdays as day, i (i + "day")}
                  <DatePicker.HeadCell>
                    {day}
                  </DatePicker.HeadCell>
                {/each}
              </DatePicker.GridRow>
            </DatePicker.GridHead>
            <DatePicker.GridBody>
              {#each month.weeks as weekDates, i (i + "weekDates")}
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
