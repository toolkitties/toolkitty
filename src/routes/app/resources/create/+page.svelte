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
</script>

<h1>Create resource</h1>
    
<CustomCalendar 
    isReadOnly={false} 
    canSelectMultiple={true} 
    hasTimePicker={true} 
    festivalDates={festivalDates} 
/>
