<script lang="ts">
  //   import FestivalCalendar from "./FestivalCalendar.svelte";
  import { calendars } from "$lib/api";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";
  import { parseCalendarData } from "$lib/utils";

  let { formType, calendarId = null } = $props();
  let noEndDate = $state(false);

  function handleSubmit(e: Event) {
    if (formType === "create") {
      handleCreateCalendar(e);
    } else if (formType === "edit") {
      handleUpdateCalendar(e);
    }
  }

  async function handleCreateCalendar(e: Event) {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const payload = { fields: parseCalendarData(formData, noEndDate) };
    try {
      await calendars.create(payload);
      toast.success("Calendar created!");
      goto(`/app/events`);
    } catch (error) {
      console.error("Error creating calendar: ", error);
      toast.error("Error creating calendar!");
    }
  }

  async function handleUpdateCalendar(e: Event) {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const payload = parseCalendarData(formData, noEndDate);

    try {
      await calendars.update(calendarId, payload);
      toast.success("Calendar updated!");
      goto(`/app/events`);
    } catch (error) {
      console.error("Error updating calendar: ", error);
      toast.error("Error updating calendar!");
    }
  }
</script>

<form onsubmit={handleSubmit}>
  {#if calendarId}
    <input type="text" bind:value={calendarId} />
  {/if}
  <label for="name">Calendar name*</label>
  <input type="text" name="name" required />
  <!--
  Not including this yet because non-continuous calendar dates aren't aren't reflected
  in the calendar fields yet - but you could set them with the FestivalCalendar.
  Would be a consideration for form validation, we would need to make sure EITHER the
  dates have been selected in the calendar or as start and end/no end -->
  <!-- <FestivalCalendar selectMultiple={true} /> -->
  <div class="flex flex-row">
    <div class="start-date">
      <label for="calendar-start-date">Start Date *</label>
      <input name="calendar-start-date" type="date" required />
    </div>
    <div class="end-date">
      <label for="calendar-end-date">End Date *</label>
      <input name="calendar-end-date" type="date" />
      <label>
        <input type="checkbox" bind:checked={noEndDate} />
        no end date
      </label>
    </div>
  </div>
  {#if formType === "edit"}
    <label for="description">Festival instructions</label>
    <textarea name="description"></textarea>
    <label for="description">Spaces page text</label>
    <textarea name="description"></textarea>
    <label for="description">Resources page text</label>
    <textarea name="description"></textarea>
    <button type="submit">Update Calendar</button>
  {/if}
  {#if formType === "create"}
    <button type="submit">Create Calendar</button>
  {/if}
</form>
