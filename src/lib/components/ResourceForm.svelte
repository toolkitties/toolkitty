<script lang="ts">
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import { create, update } from "$lib/api/resources";
  import { parseResourceFormData } from "$lib/utils";

  let { formType } = $props();
  let availability: { date: string; startTime: string; endTime: string }[] =
    $state([]);
  let alwaysAvailable = $state(false);
  let multiBookable = $state(false);

  function updateAvailability(
    newAvailability: { date: string; startTime: string; endTime: string }[],
  ) {
    availability = newAvailability;
  }

  function handleSubmit(e: Event) {
    if (formType === "create") {
      handleCreateResource(e);
    } else if (formType === "edit") {
      handleUpdateResource(e);
    }
  }

  async function handleCreateResource(e: Event) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const payload = parseResourceFormData(
      formData,
      alwaysAvailable,
      availability,
    );

    try {
      const response = await create(payload);
      console.log("Resource created with ID:", response);
    } catch (error) {
      console.error("Error creating resource:", error);
    }
  }

  async function handleUpdateResource(e: Event) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const resourceId = "1"; // @todo - fetch properly
    const payload = parseResourceFormData(
      formData,
      alwaysAvailable,
      availability,
    );

    try {
      const response = await update(resourceId, payload);
      console.log("Resource updated", response);
    } catch (error) {
      console.error("Error updating resource:", error);
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <label for="resource-name">Resource Name*</label>
  <input type="text" name="name" required />

  <label for="resource-description">Description*</label>
  <textarea name="description" required></textarea>

  <label for="contact-details">Contact Details*</label>
  <input type="text" name="contact" required />

  <fieldset>
    <legend>🔗 Useful link (website, social media)</legend>
    <div class="flex flex-row">
      <div>
        <label for="resource-link-text">Link Title</label>
        <input type="text" name="link-text" />
      </div>
      <div>
        <label for="resource-link-url">URL</label>
        <input type="url" name="link-url" />
      </div>
    </div>
  </fieldset>

  <p>Resource availability</p>
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

  <p>Can this resource have multiple bookings at the same time?</p>
  <fieldset>
    <label for="multi-bookable">Yes</label>
    <input
      type="radio"
      name="multiBookable"
      value="true"
      bind:group={multiBookable}
    />
    <label for="multi-bookable">No</label>
    <input
      type="radio"
      name="multiBookable"
      value="false"
      bind:group={multiBookable}
      checked
    />
  </fieldset>

  {#if formType === "create"}
    <button type="submit">Create Resource</button>
  {/if}
  {#if formType === "edit"}
    <button type="submit">Update Resource</button>
  {/if}
</form>
