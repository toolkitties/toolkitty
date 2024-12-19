<script lang="ts">
import type { DateValue } from "@internationalized/date";
import { CalendarDate } from "@internationalized/date";
import CustomCalendar from '../../../components/CustomCalendar.svelte';

// placeholder data
const festivalDates: DateValue[] = [
    new CalendarDate(2024, 12, 11),
    new CalendarDate(2024, 12, 12),
    new CalendarDate(2024, 12, 13),
    new CalendarDate(2024, 12, 14),
    new CalendarDate(2024, 12, 15),
    new CalendarDate(2024, 12, 16),
];

const eventsCount: Object[] = [
    {
        date: new CalendarDate(2024, 12, 11),
        numberOfEvents: 5
    },
    {
        date: new CalendarDate(2024, 12, 12),
        numberOfEvents: 3
    },
    {
        date: new CalendarDate(2024, 12, 13),
        numberOfEvents: 2
    },
    {
        date: new CalendarDate(2024, 12, 14),
        numberOfEvents: 4
    },
    {
        date: new CalendarDate(2024, 12, 15),
        numberOfEvents: 1
    },
    {
        date: new CalendarDate(2024, 12, 16),
        numberOfEvents: 0
    },
]

</script>
<h1>My Festival</h1>

<CustomCalendar 
    use={"festival overview"}
    canSelectMultiple={false} 
    hasTimePicker={false} 
    festivalDates={festivalDates} 
    eventsCount={eventsCount}
/>
