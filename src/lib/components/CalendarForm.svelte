<script>
  import FestivalCalendar from "./FestivalCalendar.svelte";
  let { formType } = $props();
  let noEndDate = $state(false);
</script>

<form>
  <label for="name">Calendar name*</label>
  <input type="text" name="name" required />
  <!-- note for form validation: they need to submit calendar dates, but it can be done either
  with FestivalCalendar, for non-consecutive dates, or with start and end dates for one 
  continuous span -->
  <FestivalCalendar selectMultiple={true} />
  <div class="flex flex-row">
    <div class="start-date">
      <label for="festival-start-date">Start Date *</label>
      <input name="festival-start-date" type="date" required />
    </div>
    <div class="end-date">
      <label for="festival-end-date">End Date *</label>
      <input name="festival-end-date" type="time" required />
      <label>
        <input type="checkbox" bind:checked={noEndDate} />
        no end date
      </label>
    </div>
  </div>
  <label for="description">Festival instructions</label>
  <textarea name="description"></textarea>
  {#if formType === "edit"}
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
