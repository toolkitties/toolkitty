<script lang="ts">
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { SpaceSchema } from "$lib/schemas";
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import { spaces } from "$lib/api";
  import { parseSpaceFormData } from "$lib/utils";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";
  import { spaceSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { superForm } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";

  let { data }: { data: SuperValidated<Infer<SpaceSchema>> } = $props();

  let availability: { date: string; startTime: string; endTime: string }[] =
    $state([]);
  let alwaysAvailable = $state(false);

  function updateAvailability(
    newAvailability: { date: string; startTime: string; endTime: string }[],
  ) {
    availability = newAvailability;
  }

  const { form, errors, message, constraints, enhance } = superForm(data, {
    SPA: true,
    validators: zod(spaceSchema),
    resetForm: false,
    dataType: "json",
    async onUpdate({ form }) {
      if (form.data.id) {
        console.log("update space");
        handleUpdateSpace(form.data);
      } else {
        console.log("create space");
        handleCreateSpace(form.data);
      }
    },
  });

  async function handleCreateSpace(data: SpaceFields) {
    try {
      const spaceId = await spaces.create(data);
      toast.success("Space created!");
      goto(`/app/spaces/${spaceId}`);
    } catch (error) {
      console.error("Error creating space: ", error);
      toast.error("Error creating space!");
    }
  }

  async function handleUpdateSpace(data: SpaceFields) {
    try {
      await spaces.update(data.id, data);
      toast.success("Space updated!");
      goto(`/app/spaces/${data.id}`);
    } catch (error) {
      console.error("Error updating space: ", error);
      toast.error("Error updating space!");
    }
  }

  // Reset form.location to the correct object type when form.type is changed
  function updateLocation() {
    if ($form.type === "physical") {
      $form.location = {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      };
    } else if ($form.type === "gps") {
      $form.location = {
        lat: "",
        lon: "",
      };
    } else if ($form.type === "virtual") {
      $form.location = "";
    }
  }
</script>

<SuperDebug data={{ $form, $errors }} />
<form method="POST" use:enhance>
  <fieldset>
    <label for="physical">Physical Location</label>
    <input
      type="radio"
      name="space-type"
      value="physical"
      bind:group={$form.type}
      onchange={updateLocation}
      checked
    />
    <label for="gps">GPS coordinates</label>
    <input
      type="radio"
      name="space-type"
      value="gps"
      bind:group={$form.type}
      onchange={updateLocation}
    />
    <label for="virtual">Virtual Space</label>
    <input
      type="radio"
      name="space-type"
      value="virtual"
      bind:group={$form.type}
      onchange={updateLocation}
    />
  </fieldset>

  <label for="space-name">Space Name*</label>
  <input type="text" name="space-name" />
  {#if $form.type === "physical"}
    <fieldset>
      <legend>Address</legend>
      <label for="address-street">Street</label>
      <input
        type="text"
        name="address-street"
        bind:value={$form.location.street}
      />

      <label for="address-city">City</label>
      <input type="text" name="address-city" bind:value={$form.location.city} />

      <label for="address-state">State</label>
      <input
        type="text"
        name="address-state"
        bind:value={$form.location.state}
      />

      <label for="address-zip">Zip</label>
      <input type="text" name="address-zip" bind:value={$form.location.zip} />

      <label for="address-country">Country</label>
      <input
        type="text"
        name="address-country"
        bind:value={$form.location.country}
      />
    </fieldset>
  {:else if $form.type === "gps"}
    <fieldset>
      <legend>Co-ordinates</legend>
      <label for="address-lat">Latitude*</label>
      <input type="number" name="address-lat" bind:value={$form.location.lat} />
      <label for="address-lon">Longitude*</label>
      <input type="number" name="address-lon" bind:value={$form.location.lon} />
    </fieldset>
  {:else if $form.type === "virtual"}
    <label for="address-virtual">Link to virtual space*</label>
    <input type="text" name="address-virtual" bind:value={$form.location} />
  {/if}

  <label for="capacity">Capacity*</label>
  <input type="number" name="capacity" bind:value={$form.capacity} />

  <label for="accessibility-details">Accessibility Details*</label>
  <textarea name="accessibility-details" bind:value={$form.accessibilityDetails}
  ></textarea>

  <label for="space-description">Space Description*</label>
  <textarea name="space-description" bind:value={$form.description}></textarea>

  <label for="contact-details">Contact Details*</label>
  <input type="text" name="contact-details" bind:value={$form.contactDetails} />

  <fieldset>
    <legend>🔗 Useful link (website, social media)</legend>
    <div class="flex flex-row">
      <div>
        <label for="space-link-text">Link Title</label>
        <input
          type="text"
          name="space-link-text"
          bind:value={$form.link.title}
        />
      </div>
      <div>
        <label for="space-link-url">URL</label>
        <input type="url" name="space-link-url" bind:value={$form.link.url} />
      </div>
    </div>
  </fieldset>

  <label for="space-message">Your message to anyone booking this space</label>
  <input
    type="text"
    name="space-message"
    placeholder="Please let me know in advance if..."
    bind:value={$form.message}
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
    <input
      type="radio"
      name="multi-bookable"
      value="true"
      bind:group={$form.multiBookable}
    />
    <label for="multi-bookable">No</label>
    <input
      type="radio"
      name="multi-bookable"
      value="false"
      bind:group={$form.multiBookable}
    />
  </fieldset>

  <button type="submit">{$form.id ? "Update" : "Create"}</button>
</form>
