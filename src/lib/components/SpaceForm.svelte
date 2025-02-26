<script lang="ts">
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  let { formType } = $props();
  import { getActiveCalendarId } from "$lib/api/calendars";
  import { create } from "$lib/api/spaces";

  function handleCreateSpace(e: Event) {
    e.preventDefault();

    const calendarId = getActiveCalendarId();

    const form = e.currentTarget as HTMLFormElement;
    console.log(form);
    const formData = new FormData(form);
    console.log(formData);
    const fields = {};
  }
</script>

<form onsubmit={handleCreateSpace}>
  <fieldset>
    <label for="physical">Physical Location</label>
    <input type="radio" name="space-type" value="physical" checked />
    <label for="gps">GPS coordinates</label>
    <input type="radio" name="space-type" value="gps" />
    <label for="virtual">Virtual Space</label>
    <input type="radio" name="space-type" value="virtual" />
  </fieldset>
  <label for="address">Address*</label>
  <input type="text" name="address" required />
  <label for="capacity">Capacity*</label>
  <input type="text" name="capacity" required />
  <label for="accessibility-details">Accessibility Details*</label>
  <textarea name="accessibility-details" required></textarea>
  <label for="space-description">Space Description*</label>
  <textarea name="space-description" required></textarea>
  <label for="contact-details">Contact Details*</label>
  <input type="text" name="contact-details" required />
  <p>🔗 Useful link (website, social media)</p>
  <div class="flex flex-row">
    <div>
      <label for="space-link-text">Link Title</label>
      <input type="text" name="space-link-text" />
    </div>
    <div>
      <label for="space-link-url">URL</label>
      <input type="url" name="space-link-url" />
    </div>
  </div>
  <label for="space-message">Your message to anyone booking this space</label>
  <input
    type="text"
    name="space-message"
    placeholder="Please let me know in advance if..."
  />
  <p>Space availability</p>
  <AvailabilitySetter />
  {#if formType === "create"}
    <button type="submit">Create Space</button>
  {/if}
  {#if formType === "edit"}
    <button type="submit">Update Space</button>
  {/if}
</form>
