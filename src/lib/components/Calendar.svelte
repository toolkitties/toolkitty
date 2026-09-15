<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import ChevronLeftIcon from "$lib/components/icons/ChevronLeftIcon.svelte";
  import ChevronRightIcon from "$lib/components/icons/ChevronRightIcon.svelte";

  type ExtendedCalendarRootProps = {
    type: "single";
    variant?: "default" | "programme";
    minValue?: DateValue;
    maxValue?: DateValue;
    placeholder?: DateValue;
    value?: DateValue;
    onValueChange?: (value: DateValue | undefined) => void;
    busyness?: {
      date: string;
      eventsList: CalendarEventEnriched[];
    }[];
    dayClass?: (date: DateValue) => string;
    dayAriaDisabled?: (date: DateValue) => boolean | undefined;
    dayAriaLabel?: (date: DateValue) => string | undefined;
    dayTitle?: (date: DateValue) => string | undefined;
    dayOnClick?: (date: DateValue) => void;
  };

  let {
    type,
    variant = "default",
    minValue,
    maxValue,
    placeholder = $bindable(),
    value = $bindable(),
    busyness,
    dayClass,
    dayAriaDisabled,
    dayAriaLabel,
    dayTitle,
    dayOnClick,
    onValueChange,
  }: ExtendedCalendarRootProps = $props();

  /**
   * Busy-ness indicator on highlighted dates
   * Return a opacity value between 0 and 100.
   * 0 = no events
   * 100 = 5 or more events.
   */
  function getBusynessOpacity(date: DateValue): number {
    if (!busyness) {
      return 0;
    }

    const groupForDate = busyness.find(
      (group) => group.date === date.toString(),
    );

    if (!groupForDate) {
      return 0;
    }

    const eventCount = Math.min(groupForDate.eventsList.length, 5);
    return (eventCount / 5) * 100;
  }
</script>

<Calendar.Root
  {type}
  {minValue}
  {maxValue}
  {placeholder}
  class={variant === "programme" ? "w-full px-3 pb-3 pt-4" : undefined}
  bind:value
  {onValueChange}
  fixedWeeks={variant === "programme"}
  weekdayFormat={variant === "programme" ? "short" : undefined}
>
  {#snippet children({ months, weekdays })}
    <Calendar.Header
      class={variant === "programme" ? "mb-4 grid w-full grid-cols-[1fr_auto_auto] items-center gap-1" : "flex flex-row"}
    >
      <Calendar.Heading
        class={variant === "programme" ? "col-start-1 ml-6 text-left text-[1.35rem] leading-none normal-case" : ""}
      />
      {#if variant === "programme"}
        <div class="col-span-2 flex justify-end gap-1 mr-4">
          <Calendar.PrevButton
            type="button"
            aria-label="Previous month"
            class="grid size-8 place-items-center border-0 bg-transparent p-0"
          >
            <ChevronLeftIcon size={20} />
          </Calendar.PrevButton>
          <Calendar.NextButton
            type="button"
            aria-label="Next month"
            class="grid size-8 place-items-center border-0 bg-transparent p-0"
          >
            <ChevronRightIcon size={20} />
          </Calendar.NextButton>
        </div>
      {:else}
        <Calendar.PrevButton
          type="button"
          aria-label="Previous month"
          class="w-8 mr-2"
        >←</Calendar.PrevButton>
        <Calendar.NextButton
          type="button"
          aria-label="Next month"
          class="w-8 ml-2"
        >→</Calendar.NextButton>
      {/if}
    </Calendar.Header>

    {#each months as month (month.value)}
        <Calendar.Grid
          class={variant === "programme" ? "w-full table-fixed border-separate border-spacing-y-2" : ""}
        >
        <Calendar.GridHead>
          <Calendar.GridRow>
            {#each weekdays as day, index (index)}
              <Calendar.HeadCell
                class={variant === "programme" ? "pb-2 text-center font-sans text-[1.1rem] font-normal leading-none" : ""}
              >
                {day}
              </Calendar.HeadCell>
            {/each}
          </Calendar.GridRow>
        </Calendar.GridHead>
        <Calendar.GridBody>
          {#each month.weeks as weekDates, weekIndex (weekIndex)}
            <Calendar.GridRow>
              {#each weekDates as date (date)}
                <Calendar.Cell
                  {date}
                  month={month.value}
                  class={variant === "programme" ? "text-center" : undefined}
                >
                  <Calendar.Day
                    onclick={() => dayOnClick?.(date)}
                    class={`${variant === "programme" ? "mx-auto inline-flex size-9 items-center justify-center rounded-md border border-transparent p-0 text-[1.4rem] leading-none normal-case" : "border-black border rounded"}
                      data-outside-month:pointer-events-none
                      ${variant === "programme" ? "data-outside-month:text-grey-medium-light" : "data-outside-month:text-gray-300"}
                      ${variant === "programme" ? "data-selected:bg-green-light-fluro data-selected:text-black" : "data-selected:bg-black data-selected:text-white"}
                      data-disabled:opacity-50
                      data-disabled:border-0
                      ${busyness ? `bg-physical/${getBusynessOpacity(date)}` : ""}
                      ${dayClass ? dayClass(date) : ""}`}
                    aria-disabled={dayAriaDisabled?.(date)}
                    aria-label={dayAriaLabel?.(date)}
                    title={dayTitle?.(date)}
                  >
                    {date.day}
                  </Calendar.Day>
                </Calendar.Cell>
              {/each}
            </Calendar.GridRow>
          {/each}
        </Calendar.GridBody>
      </Calendar.Grid>
    {/each}
  {/snippet}
</Calendar.Root>
