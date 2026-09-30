<script lang="ts">
  import { Calendar } from "bits-ui";
  import type { DateValue } from "@internationalized/date";
  import ChevronLeftIcon from "$lib/components/icons/ChevronLeftIcon.svelte";
  import ChevronRightIcon from "$lib/components/icons/ChevronRightIcon.svelte";

  type ExtendedCalendarRootProps = {
    type: "single";
    variant?: "default" | "standard";
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

  let internalPlaceholder: DateValue | undefined = $state(placeholder);
  let lastExternalPlaceholder = $state(placeholder?.toString());

  $effect(() => {
    const nextExternalPlaceholder = placeholder?.toString();

    if (nextExternalPlaceholder !== lastExternalPlaceholder) {
      internalPlaceholder = placeholder;
      lastExternalPlaceholder = nextExternalPlaceholder;
    }
  });

  function toDateKey(date: DateValue | string): string {
    return date.toString().split("T")[0];
  }

  /**
   * Busy-ness indicator on highlighted dates.
   * More events means stronger yellow background.
   */
  function getBusynessCount(date: DateValue): number {
    if (!busyness) return 0;

    const dateKey = toDateKey(date);
    const groupForDate = busyness.find(
      (group) => toDateKey(group.date) === dateKey,
    );

    return groupForDate?.eventsList.length ?? 0;
  }

  function getBusynessClass(date: DateValue): string {
    const eventCount = getBusynessCount(date);

    if (eventCount === 0) {
      return variant === "standard" ? "text-grey-dark" : "";
    }

    return "border-black text-black";
  }

  function getBusynessStyle(date: DateValue): string | undefined {
    if (value && toDateKey(date) === toDateKey(value)) {
      return undefined;
    }

    const eventCount = Math.min(getBusynessCount(date), 5);

    if (eventCount === 0) {
      return undefined;
    }

    const backgrounds = [
      "",
      "rgba(253, 255, 180, 0.45)",
      "rgba(253, 255, 180, 0.6)",
      "rgba(253, 255, 180, 0.75)",
      "rgba(253, 255, 180, 0.9)",
      "#fdffb4",
    ];

    return `background-color: ${backgrounds[eventCount]};`;
  }
</script>

<Calendar.Root
  {type}
  {minValue}
  {maxValue}
  bind:placeholder={internalPlaceholder}
  class={variant === "standard" ? "w-full bg-grey-light px-3 pb-3 pt-2" : undefined}
  bind:value
  {onValueChange}
  fixedWeeks={variant === "standard"}
  weekdayFormat={variant === "standard" ? "short" : undefined}
>
  {#snippet children({ months, weekdays })}
    <Calendar.Header
      class={variant === "standard" ? "mb-3 grid w-full grid-cols-[1fr_auto_auto] items-center gap-1" : "flex flex-row"}
    >
      <Calendar.Heading
        class={variant === "standard" ? "col-start-1 text-left text-[1.35rem] leading-none normal-case" : ""}
      />
      {#if variant === "standard"}
        <div class="col-span-2 flex justify-end gap-2">
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
          class={variant === "standard" ? "w-full table-fixed border-separate border-spacing-y-2" : ""}
        >
        <Calendar.GridHead>
          <Calendar.GridRow>
            {#each weekdays as day, index (index)}
              <Calendar.HeadCell
                class={variant === "standard" ? "pb-2 text-center font-sans text-[1.1rem] font-normal leading-none" : ""}
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
                  class={variant === "standard" ? "text-center" : undefined}
                >
                  <Calendar.Day
                    onclick={() => dayOnClick?.(date)}
                    class={`${variant === "standard" ? "mx-auto inline-flex size-10 items-center justify-center rounded-md border border-transparent p-0 text-[1.35rem] leading-none normal-case" : "border-black border rounded"}
                      data-outside-month:pointer-events-none
                      ${variant === "standard" ? "data-outside-month:text-grey-medium-light" : "data-outside-month:text-gray-300"}
                      ${variant === "standard" ? "data-selected:bg-green-light-fluro data-selected:text-black data-selected:border-black" : "data-selected:bg-black data-selected:text-white"}
                      data-disabled:opacity-50
                      data-disabled:border-0
                      ${busyness ? getBusynessClass(date) : ""}
                      ${dayClass ? dayClass(date) : ""}`}
                    style={busyness ? getBusynessStyle(date) : undefined}
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
