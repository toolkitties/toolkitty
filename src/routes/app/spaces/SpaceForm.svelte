<script lang="ts">
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { SpaceSchema } from "$lib/schemas";
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import { spaces } from "$lib/api";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";
  import { spaceSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { superForm } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";

  let {
    data,
    activeCalendarId,
    calendarDates,
  }: {
    data: SuperValidated<Infer<SpaceSchema>>;
    activeCalendarId: Hash;
    calendarDates: TimeSpan;
  } = $props();

  let alwaysAvailable = $state(false);

  const { form, errors, enhance } = superForm(data, {
    SPA: true,
    validators: zod(spaceSchema),
    resetForm: false,
    dataType: "json",
    async onUpdate({ form }) {
      if (form.valid) {
        const { id, ...payload } = form.data;
        if (form.data.id) {
          console.log("update space");
          handleUpdateSpace(id!, payload);
        } else {
          console.log("create space");
          handleCreateSpace(payload);
        }
      }
    },
  });

  async function handleCreateSpace(payload: SpaceFields) {
    try {
      const spaceId: Hash = await spaces.create(activeCalendarId, payload);
      toast.success("Space created!");
      goto(`#/app/spaces/${spaceId}`);
    } catch (error) {
      console.error("Error creating space: ", error);
      toast.error("Error creating space!");
    }
  }

  async function handleUpdateSpace(spaceId: Hash, payload: SpaceFields) {
    try {
      await spaces.update(spaceId, payload);
      toast.success("Space updated!");
      goto(`#/app/spaces/${spaceId}`);
    } catch (error) {
      console.error("Error updating space: ", error);
      toast.error("Error updating space!");
    }
  }

  // Reset form.location to the correct object type when form.type is changed
  function updateLocation() {
    if ($form.location.type === "physical") {
      $form.location = {
        type: "physical",
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      };
    } else if ($form.location.type === "gps") {
      $form.location = {
        type: "gps",
        lat: 0,
        lon: 0,
      };
    } else if ($form.location.type === "virtual") {
      $form.location = {
        type: "virtual",
        link: "",
      };
    }
  }
</script>

<SuperDebug data={{ $form, $errors }} />
<fieldset>
  <label for="physical">Physical Location</label>
  <input
    type="radio"
    name="space-type"
    value="physical"
    bind:group={$form.location.type}
    onchange={updateLocation}
    checked
  />
  <label for="gps">GPS coordinates</label>
  <input
    type="radio"
    name="space-type"
    value="gps"
    bind:group={$form.location.type}
    onchange={updateLocation}
  />
  <label for="virtual">Virtual Space</label>
  <input
    type="radio"
    name="space-type"
    value="virtual"
    bind:group={$form.location.type}
    onchange={updateLocation}
  />
  {#if $errors.location?.type}<span class="form-error"
      >{$errors.location?.type}</span
    >{/if}
</fieldset>

<form method="POST" use:enhance>
  <label for="space-name">Space Name*</label>
  <input type="text" name="space-name" bind:value={$form.name} />
  {#if $form.location.type === "physical"}
    <fieldset>
      <legend>Address</legend>
      <label for="address-street">Street</label>
      <input
        type="text"
        name="address-street"
        aria-invalid={$errors.location?.street ? "true" : undefined}
        bind:value={$form.location.street}
      />
      {#if $errors.location?.street}<span class="form-error"
          >{$errors.location?.street}</span
        >{/if}

      <label for="address-city">City</label>
      <input
        type="text"
        name="address-city"
        aria-invalid={$errors.location?.city ? "true" : undefined}
        bind:value={$form.location.city}
      />
      {#if $errors.location?.city}<span class="form-error"
          >{$errors.location?.city}</span
        >{/if}

      <label for="address-state">State</label>
      <input
        type="text"
        name="address-state"
        aria-invalid={$errors.location?.state ? "true" : undefined}
        bind:value={$form.location.state}
      />
      {#if $errors.location?.state}<span class="form-error"
          >{$errors.location?.state}</span
        >{/if}

      <label for="address-zip">Zip</label>
      <input
        type="text"
        name="address-zip"
        aria-invalid={$errors.location?.zip ? "true" : undefined}
        bind:value={$form.location.zip}
      />
      {#if $errors.location?.zip}<span class="form-error"
          >{$errors.location?.zip}</span
        >{/if}

      <label for="address-country">Country</label>
      <input
        type="text"
        name="address-country"
        aria-invalid={$errors.location?.country ? "true" : undefined}
        bind:value={$form.location.country}
      />
      {#if $errors.location?.country}<span class="form-error"
          >{$errors.location?.country}</span
        >{/if}
    </fieldset>
  {:else if $form.location.type === "gps"}
    <fieldset>
      <legend>Co-ordinates</legend>
      <label for="address-lat">Latitude*</label>
      <input
        type="number"
        name="address-lat"
        aria-invalid={$errors.location?.lat ? "true" : undefined}
        bind:value={$form.location.lat}
      />
      {#if $errors.location?.lat}<span class="form-error"
          >{$errors.location?.lat}</span
        >{/if}
      <label for="address-lon">Longitude*</label>
      <input
        type="number"
        name="address-lon"
        aria-invalid={$errors.location?.lon ? "true" : undefined}
        bind:value={$form.location.lon}
      />
      {#if $errors.location?.lon}<span class="form-error"
          >{$errors.location?.lon}</span
        >{/if}
    </fieldset>
  {:else if $form.location.type === "virtual"}
    <label for="address-virtual">Link to virtual space*</label>
    <input
      type="text"
      name="address-virtual"
      aria-invalid={$errors.location ? "true" : undefined}
      bind:value={$form.location.link}
    />
    {#if $errors.location}<span class="form-error">{$errors.location.link}</span
      >{/if}
  {/if}

  <label for="capacity">Capacity</label>
  <input
    type="number"
    name="capacity"
    aria-invalid={$errors.capacity ? "true" : undefined}
    bind:value={$form.capacity}
  />
  {#if $errors.capacity}<span class="form-error">{$errors.capacity}</span>{/if}

  <label for="accessibility-details">Accessibility Details*</label>
  <textarea
    name="accessibility-details"
    aria-invalid={$errors.accessibility ? "true" : undefined}
    bind:value={$form.accessibility}
  ></textarea>
  {#if $errors.accessibility}<span class="form-error"
      >{$errors.accessibility}</span
    >{/if}

  <label for="space-description">Space Description*</label>
  <textarea
    name="space-description"
    aria-invalid={$errors.description ? "true" : undefined}
    bind:value={$form.description}
  ></textarea>
  {#if $errors.description}<span class="form-error">{$errors.description}</span
    >{/if}

  <label for="contact-details">Contact Details*</label>
  <input
    type="text"
    name="contact-details"
    aria-invalid={$errors.contact ? "true" : undefined}
    bind:value={$form.contact}
  />
  {#if $errors.contact}<span class="form-error">{$errors.contact}</span>{/if}

  <fieldset>
    <legend>🔗 Useful link (website, social media)</legend>
    <div class="flex flex-row">
      <div>
        <!-- TODO: Fix type issue with '$form.link' is possibly being 'null'. -->
        <label for="space-link-text">Link Title</label>
        <input
          type="text"
          name="space-link-text"
          aria-invalid={$errors.link?.title ? "true" : undefined}
          bind:value={$form.link.title}
        />
        {#if $errors.link?.title}<span class="form-error"
            >{$errors.link?.title}</span
          >{/if}
      </div>
      <div>
        <label for="space-link-url">URL</label>
        <input
          type="url"
          name="space-link-url"
          aria-invalid={$errors.link?.url ? "true" : undefined}
          bind:value={$form.link.url}
        />
        {#if $errors.link?.url}<span class="form-error"
            >{$errors.link?.url}</span
          >{/if}
      </div>
    </div>
  </fieldset>

  <label for="space-message">Your message to anyone booking this space</label>
  <input
    type="text"
    name="space-message"
    placeholder="Please let me know in advance if..."
    aria-invalid={$errors.messageForRequesters ? "true" : undefined}
    bind:value={$form.messageForRequesters}
  />
  {#if $errors.messageForRequesters}<span class="form-error"
      >{$errors.messageForRequesters}</span
    >{/if}

  <p>Space availability</p>
  {#if alwaysAvailable}
    <p>This space is always available</p>
  {/if}
  {#if !alwaysAvailable}
    <AvailabilitySetter
      bind:availability={$form.availability as TimeSpan[]}
      {calendarDates}
    />
    {#if $errors.availability}
      <span class="form-error">{$errors.availability._errors}</span>
    {/if}
  {/if}

  <label>
    <input
      type="checkbox"
      bind:checked={alwaysAvailable}
      onchange={() => {
        if (alwaysAvailable) {
          $form.availability = "always";
        }
      }}
    />
    Always Available
  </label>
  <fieldset>
    <label for="multiBookable"
      >Can this space have multiple bookings at the same time?
    </label>
    <input
      id="multiBookable"
      type="checkbox"
      name="multiBookable"
      bind:checked={$form.multiBookable}
    />
  </fieldset>
  {#if $errors.multiBookable}<span class="form-error"
      >{$errors.multiBookable}</span
    >{/if}

  <button type="submit">{$form.id ? "Update" : "Create"}</button>
</form>
