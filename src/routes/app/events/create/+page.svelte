<script lang="ts">
    import type { DateValue } from "@internationalized/date";
    import { CalendarDate } from "@internationalized/date";
    import CustomCalendar from '../../../../components/CustomCalendar.svelte';

    // placeholder data
    const festivalDates: DateValue[] = [
        new CalendarDate(2024, 12, 11),
        new CalendarDate(2024, 12, 12),
        new CalendarDate(2024, 12, 13),
        new CalendarDate(2024, 12, 14),
        new CalendarDate(2024, 12, 15),
        new CalendarDate(2024, 12, 16),
    ];

    const availableDates: DateValue[] = [
        new CalendarDate(2024, 12, 14),
        new CalendarDate(2024, 12, 15),
    ]

    const availableTimes: Object[] = [
        {
            date: new CalendarDate(2024, 12, 14),
            times: ["12:00 - 13:00", "17:00 - 18:00", "18:00 - 19:00"]
        },
        {
            date: new CalendarDate(2024, 12, 15),
            times: ["10:00 - 11:00", "1:00 - 12:00", "12:00 - 13:00", "20:00 - 21:00", "21:00 - 22:00"]
        },
    ]
</script>

<h1>Create event</h1>
    
<CustomCalendar 
    isReadOnly={false} 
    canSelectMultiple={false} 
    hasTimePicker={true} 
    festivalDates={festivalDates} 
    availableDates={availableDates}
    availableTimes={availableTimes}
/>
