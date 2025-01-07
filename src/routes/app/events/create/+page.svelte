<script lang="ts">
    import type { DateValue } from "@internationalized/date";
    import { CalendarDate } from "@internationalized/date";
    import Calendar from "../../../../components/calendar.svelte";

</script>

<h1>Create event</h1> <!-- TODO: replace with header component import -->

<p>Hello organisers! Fill this form to upload your event to the program.</p>
<p>YOU NEED A SPACE BEFORE YOU CREATE AN EVENT</p>

<form>
    <label for="event-name">Event Name *</label>
    <input name="event-name" type="text" required>

    <label for="event-description">Description *</label>
    <textarea name="event-description" required ></textarea>

    <label for="event-start-time">Start time *</label>
    <input name="event-start-time" type="time" required>

    <label for="event-end-time">End time</label>
    <input name="event-end-time" type="time">

    <label for="select-space">Select Space</label>
    <select name="select-space">
        <option value="space-1">Space 1</option>
        <option value="space-1">Space 2</option>
        <option value="space-1">Space 3</option>
    </select>
    <!-- calendar of availability tied to each space goes here -->
    <select name="select-resources">
        <option value="space-1">Space 1</option>
        <option value="space-1">Space 2</option>
        <option value="space-1">Space 3</option>
    </select>
    <!-- calendar of availability tied to each resource goes here -->
    <!-- image upload component here-->
    <!-- tag selector -->
</form>
