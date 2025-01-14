<script lang="ts">
    import { Calendar } from "bits-ui";
    import { CalendarDate } from "@internationalized/date";
    import type { DateValue } from "@internationalized/date";
    import TimePicker from "./time-picker.svelte";

    let { 
        resources = null,
        currentlySelectedId
    } = $props();

    interface AvailableDateEntry {
        date: string;
        timeslots: string[];
    }

    let availableDatesAndTimes = resources[currentlySelectedId - 1].availability;

    let availableCalendarDates = availableDatesAndTimes.map((entry: AvailableDateEntry) => {
        let dateString: string = entry.date;
        let date = new Date(dateString);
        return new CalendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    });

    let selectedDate: DateValue | null = null;
    let timeslots: string[] = [];

    const handleDateSelect = (value: DateValue | DateValue[] | undefined) => {
        if (Array.isArray(value)) {
            selectedDate = value.length > 0 ? value[0] : null;
        } else {
            selectedDate = value || null;
        }

        // Update the timeslots based on the selected date
        if (selectedDate) {
            const calendarDate = new CalendarDate(selectedDate.year, selectedDate.month, selectedDate.day);
            timeslots = getTimeSlotsForSelectedDate(calendarDate);
        } else {
            timeslots = [];
        }
    };

    const isSameDate = (date1: DateValue, date2: DateValue): boolean => {
        return (
            date1.calendar.identifier === date2.calendar.identifier &&
            date1.year === date2.year &&
            date1.month === date2.month &&
            date1.day === date2.day
        );
    };

    const isAvailableDate = (date: DateValue): boolean => {
        return availableCalendarDates && availableCalendarDates.some((d: DateValue) => isSameDate(d, date));
    };

    const getTimeSlotsForSelectedDate = (date: CalendarDate) => {
        // Find the entry in `availableDatesAndTimes` corresponding to the selected date
        const selectedDateEntry = availableDatesAndTimes.find((entry: AvailableDateEntry) => {
            const availableDate = new Date(entry.date);
            return (
                availableDate.getUTCFullYear() === date.year &&
                availableDate.getUTCMonth() === date.month - 1 && // Month in `CalendarDate` is 1-based
                availableDate.getUTCDate() === date.day
            );
        });

        // If the date has time slots available, return them
        if (selectedDateEntry) {
            return selectedDateEntry.timeslots;
        }

        // Return an empty array if no time slots are found
        return [];
    };

</script>

<Calendar.Root 
    let:months 
    let:weekdays
    onValueChange={handleDateSelect}
>
    <Calendar.Header class='flex flex-row'>
        <Calendar.PrevButton class='w-8 mr-2'>←</Calendar.PrevButton>
        <Calendar.Heading />
        <Calendar.NextButton class='w-8 ml-2'>→</Calendar.NextButton>
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
                                    class={
                                       `data-[outside-month]:pointer-events-none
                                        data-[outside-month]:text-gray-300
                                        data-[selected]:bg-black
                                        data-[selected]:text-white
                                        ${isAvailableDate(date) ? 'bg-green-300' : ''}
                                        ${!isAvailableDate(date) ? 'text-gray-400 pointer-events-none' : ''}`
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

<TimePicker 
    selectedDate={selectedDate}
    timeSlots={timeslots} 
/>
