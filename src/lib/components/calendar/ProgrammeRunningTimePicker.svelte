<!--
 @component
 Select the programme date range for a calendar.
-->

<script lang="ts">
  import Calendar from "$lib/components/Calendar.svelte";
  import {
    getLocalTimeZone,
    parseDate,
    today,
    type DateValue,
  } from "@internationalized/date";

  let {
    startDate = $bindable(),
    endDate = $bindable(),
    noEndDate = $bindable(false),
  }: {
    startDate?: string;
    endDate?: string;
    noEndDate?: boolean;
  } = $props();

  function toDateKey(value?: string): string | undefined {
    const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : undefined;
  }

  function toCalendarDate(value?: string): DateValue | undefined {
    const dateKey = toDateKey(value);
    return dateKey ? parseDate(dateKey) : undefined;
  }

  function toStoredDate(
    dateKey: string,
    currentValue: string | undefined,
    boundary: "start" | "end",
  ): string {
    if (currentValue?.includes("T")) {
      return currentValue.replace(/^\d{4}-\d{2}-\d{2}/, dateKey);
    }

    return boundary === "start"
      ? `${dateKey}T00:00:00Z`
      : `${dateKey}T23:59:59Z`;
  }

  function formatProgrammeDate(value?: string): string {
    const dateKey = toDateKey(value);
    if (!dateKey) {
      return "";
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${dateKey}T00:00:00Z`));
  }

  function isDateInSelectedRange(date: DateValue): boolean {
    const dateKey = date.toString();
    const startKey = toDateKey(startDate);
    const endKey = toDateKey(endDate);

    if (!startKey) {
      return false;
    }

    if (!endKey) {
      return dateKey === startKey;
    }

    return dateKey >= startKey && dateKey <= endKey;
  }

  function isRangeStart(date: DateValue): boolean {
    return date.toString() === toDateKey(startDate);
  }

  function isRangeEnd(date: DateValue): boolean {
    return date.toString() === toDateKey(endDate);
  }

  function selectDate(value: DateValue | undefined) {
    if (!value) {
      return;
    }

    const dateKey = value.toString();
    const startKey = toDateKey(startDate);
    const endKey = toDateKey(endDate);

    if (!startKey || endKey) {
      startDate = toStoredDate(dateKey, startDate, "start");
      endDate = undefined;
      noEndDate = true;
      return;
    }

    if (dateKey < startKey) {
      startDate = toStoredDate(dateKey, startDate, "start");
      endDate = undefined;
      noEndDate = true;
      return;
    }

    endDate = toStoredDate(dateKey, endDate, "end");
    noEndDate = false;
  }

  function selectSameDateAgain(date: DateValue) {
    if (date.toString() === selectedDate?.toString()) {
      selectDate(date);
    }
  }

  let selectedDate: DateValue | undefined = $state(toCalendarDate(startDate));
  let placeholder: DateValue = $state(
    toCalendarDate(startDate) || today(getLocalTimeZone()),
  );

  $effect(() => {
    const nextSelectedDate = toCalendarDate(startDate);
    if (nextSelectedDate?.toString() !== selectedDate?.toString()) {
      selectedDate = nextSelectedDate;
    }

    if (
      nextSelectedDate &&
      nextSelectedDate.toString() !== placeholder.toString()
    ) {
      placeholder = nextSelectedDate;
    }
  });
</script>

<section class="overflow-hidden rounded-sm border border-black bg-grey-lighter">
  <h3
    class="border-b border-black bg-grey-medium px-3 py-2 text-center text-[1.25rem] leading-tight normal-case"
  >
    Programme running time
  </h3>

  <Calendar
    type="single"
    variant="programme"
    bind:value={selectedDate}
    bind:placeholder
    onValueChange={selectDate}
    dayOnClick={selectSameDateAgain}
    dayClass={(date) =>
      `${isDateInSelectedRange(date) ? "bg-green-light-fluro text-black" : ""}
      ${isRangeStart(date) || isRangeEnd(date) ? "font-bold" : ""}`}
  />
</section>

<div
  class="mt-4 overflow-hidden rounded-sm border border-black bg-grey-lighter"
>
  <div
    class="grid grid-cols-[1fr_auto] items-center border-b border-black px-3 py-1.5"
  >
    <span class="text-[1.25rem] leading-tight">Start</span>
    <output
      aria-live="polite"
      class="min-w-30 rounded-sm border border-black bg-white px-2 py-0.5 text-right text-[1.05rem] leading-tight"
    >
      {formatProgrammeDate(startDate)}
    </output>
  </div>

  <div class="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-1.5">
    <span class="text-[1.25rem] leading-tight">End</span>
    <output
      aria-live="polite"
      class="min-w-30 rounded-sm border border-black bg-white px-2 py-0.5 text-right text-[1.05rem] leading-tight"
    >
      {formatProgrammeDate(endDate) || "no end"}
    </output>
  </div>
</div>
