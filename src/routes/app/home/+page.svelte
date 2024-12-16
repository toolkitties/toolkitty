<script lang="ts">
import CustomCalendar from '../../../components/CustomCalendar.svelte';

let festivalDates: string[] = [];
</script>
<h1>Home</h1>

<CustomCalendar 
    isReadOnly={true} 
    canSelectMultiple={false} 
    hasTimePicker={false} 
    festivalDates={festivalDates} 
/>
