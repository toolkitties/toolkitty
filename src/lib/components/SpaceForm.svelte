<script lang="ts">
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import { spaces } from "$lib/api";
  import { parseSpaceFormData } from "$lib/utils";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";

  let { formType, space = null } = $props();
  let selectedSpaceType = $state("physical");
  let availability: { date: string; startTime: string; endTime: string }[] =
    $state([]);
  let alwaysAvailable = $state(false);

  function updateAvailability(
    newAvailability: { date: string; startTime: string; endTime: string }[],
  ) {
    availability = newAvailability;
  }
  function handleSubmit(e: Event) {
    if (formType === "create") {
      handleCreateSpace(e);
    } else if (formType === "edit") {
      handleUpdateSpace(e);
    }
  }

  async function handleCreateSpace(e: Event) {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const payload = parseSpaceFormData(formData, alwaysAvailable, availability);

    try {
      await spaces.create(payload);
      toast.success("Space created!");
      //goto(`/app/spaces/${space.id}`);
    } catch (error) {
      console.error("Error creating space: ", error);
      toast.error("Error creating space!");
    }
  }

  async function handleUpdateSpace(e: Event) {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const payload = parseSpaceFormData(formData, alwaysAvailable, availability);

    try {
      await spaces.update(space.id, payload);
      toast.success("Space updated!");
      //goto(`/app/spaces/${space.id}`);
    } catch (error) {
      console.error("Error updating space: ", error);
      toast.error("Error updating space!");
    }
  }
</script>

<form onsubmit={handleSubmit}>
  {#if space}
    <input type="text" bind:value={space.id} />
  {/if}
  <fieldset>
    <label for="physical">Physical Location</label>
    <input
      type="radio"
      name="space-type"
      value="physical"
      bind:group={selectedSpaceType}
      checked
    />
    <label for="gps">GPS coordinates</label>
    <input
      type="radio"
      name="space-type"
      value="gps"
      bind:group={selectedSpaceType}
    />
    <label for="virtual">Virtual Space</label>
    <input
      type="radio"
      name="space-type"
      value="virtual"
      bind:group={selectedSpaceType}
    />
  </fieldset>

  <label for="space-name">Space Name*</label>
  <input type="text" name="space-name" required />
  {#if selectedSpaceType === "physical"}
    <fieldset>
      <legend>Address</legend>
      <label for="address-street">Street</label>
      <input type="text" name="address-street" required />
      <label for="address-city">City</label>
      <input type="text" name="address-city" required />
      <label for="address-state">State</label>
      <input type="text" name="address-state" required />
      <label for="address-zip">Zip</label>
      <input type="text" name="address-zip" required />
      <label for="address-country">Country</label>
      <input type="text" name="address-country" required />
    </fieldset>
  {/if}
  {#if selectedSpaceType === "gps"}
    <fieldset>
      <legend>Co-ordinates</legend>
      <label for="address-lat">Latitude*</label>
      <input type="number" name="address-lat" required />
      <label for="address-lon">Longitude*</label>
      <input type="number" name="address-lon" required />
    </fieldset>
  {/if}
  {#if selectedSpaceType === "virtual"}
    <label for="address-virtual">Link to virtual space*</label>
    <input type="text" name="address-virtual" required />
  {/if}
  <label for="capacity">Capacity*</label>
  <input type="number" name="capacity" required />
  <label for="accessibility-details">Accessibility Details*</label>
  <textarea name="accessibility-details" required></textarea>
  <label for="space-description">Space Description*</label>
  <textarea name="space-description" required></textarea>
  <label for="contact-details">Contact Details*</label>
  <input type="text" name="contact-details" required />

  <fieldset>
    <legend>🔗 Useful link (website, social media)</legend>
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
  </fieldset>

  <label for="space-message">Your message to anyone booking this space</label>
  <input
    type="text"
    name="space-message"
    placeholder="Please let me know in advance if..."
  />

  <p>Space availability</p>

  {#if !alwaysAvailable}
    <AvailabilitySetter
      {availability}
      onUpdateAvailability={updateAvailability}
    />
  {/if}

  <label>
    <input type="checkbox" bind:checked={alwaysAvailable} />
    Always Available
  </label>

  <p>Can this space have multiple bookings at the same time?</p>
  <fieldset>
    <label for="multi-bookable">Yes</label>
    <input type="radio" name="multi-bookable" value="true" />
    <label for="multi-bookable">No</label>
    <input type="radio" name="multi-bookable" value="false" checked />
  </fieldset>

  {#if formType === "create"}
    <button type="submit">Create Space</button>
  {/if}
  {#if formType === "edit"}
    <button type="submit">Update Space</button>
  {/if}
</form>
