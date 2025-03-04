<script lang="ts">
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { ResourceSchema } from "$lib/schemas";
  import { superForm, setMessage, setError } from "sveltekit-superforms";
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import { resources } from "$lib/api";
  import { parseResourceFormData } from "$lib/utils";
  import { resourceSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";

  let { data }: { data: SuperValidated<Infer<ResourceSchema>> } = $props();

  let availability: { date: string; startTime: string; endTime: string }[] =
    $state([]);
  let alwaysAvailable = $state(false);
  let multiBookable = $state(false);

  function updateAvailability(
    newAvailability: { date: string; startTime: string; endTime: string }[],
  ) {
    availability = newAvailability;
  }

  const { form, errors, message, constraints, enhance } = superForm(data, {
    SPA: true,
    validators: zod(resourceSchema),
    resetForm: false,
    async onUpdate({ form }) {
      if (form.data.id) {
        console.log("create resource");
        // await resources.create(form.data)
      } else {
        console.log("update resource");
        // await resources.update(form.data)
      }
    },
  });

  // function handleSubmit(e: Event) {
  //   if (formType === "create") {
  //     handleCreateResource(e);
  //   } else if (formType === "edit") {
  //     handleUpdateResource(e);
  //   }
  // }

  // async function handleCreateResource(e: Event) {
  //   e.preventDefault();
  //   const form = e.currentTarget as HTMLFormElement;
  //   const formData = new FormData(form);
  //   const payload = parseResourceFormData(
  //     formData,
  //     alwaysAvailable,
  //     availability,
  //   );

  //   try {
  //     const response = await create(payload);
  //     console.log("Resource created with ID:", response);
  //   } catch (error) {
  //     console.error("Error creating resource:", error);
  //   }
  // }

  // async function handleUpdateResource(e: Event) {
  //   e.preventDefault();
  //   const form = e.currentTarget as HTMLFormElement;
  //   const formData = new FormData(form);

  //   const resourceId = "1"; // @todo - fetch properly
  //   const payload = parseResourceFormData(
  //     formData,
  //     alwaysAvailable,
  //     availability,
  //   );

  //   try {
  //     const response = await update(resourceId, payload);
  //     console.log("Resource updated", response);
  //   } catch (error) {
  //     console.error("Error updating resource:", error);
  //   }
  // }
</script>

<form method="POST" use:enhance>
  <label for="name">Resource Name*</label>
  <input
    type="text"
    name="name"
    required
    aria-invalid={$errors.name ? "true" : undefined}
    bind:value={$form.name}
  />
  {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

  <label for="description">Description*</label>
  <textarea
    name="description"
    required
    aria-invalid={$errors.description ? "true" : undefined}
    bind:value={$form.description}
  ></textarea>
  {#if $errors.description}<span class="invalid">{$errors.description}</span
    >{/if}

  <label for="contact">Contact Details*</label>
  <input
    type="text"
    name="contact"
    required
    aria-invalid={$errors.contact ? "true" : undefined}
    bind:value={$form.contact}
  />
  {#if $errors.contact}<span class="invalid">{$errors.contact}</span>{/if}

  <fieldset>
    <legend>🔗 Useful link (website, social media)</legend>
    <div class="flex flex-row">
      <div>
        <label for="link-text">Link Title</label>
        <input
          type="text"
          name="link-text"
          aria-invalid={$errors.linkText ? "true" : undefined}
          bind:value={$form.linkText}
        />
      </div>
      <div>
        <label for="link-url">URL</label>
        <input
          type="url"
          name="link-url"
          aria-invalid={$errors.linkUrl ? "true" : undefined}
          bind:value={$form.linkUrl}
        />
      </div>
    </div>
    {#if $errors.linkText}<span class="invalid">{$errors.linkText}</span>{/if}
    {#if $errors.linkUrl}<span class="invalid">{$errors.linkUrl}</span>{/if}
  </fieldset>

  <p>Resource availability</p>
  {#if !$form.alwaysAvailable}
    <AvailabilitySetter
      {availability}
      onUpdateAvailability={updateAvailability}
    />
  {/if}

  <label>
    <input
      type="checkbox"
      name="alwaysAvailable"
      bind:checked={$form.alwaysAvailable}
    />
    Always Available
  </label>

  <p>Can this resource have multiple bookings at the same time?</p>
  <fieldset>
    <label for="multi-bookable">Yes</label>
    <input
      type="radio"
      name="multiBookable"
      value="true"
      bind:group={$form.multiBookable}
    />
    <label for="multi-bookable">No</label>
    <input
      type="radio"
      name="multiBookable"
      value="false"
      bind:group={$form.multiBookable}
      checked
    />
  </fieldset>

  <!-- {#if formType === "create"}
    <button type="submit">Create Resource</button>
  {/if}
  {#if formType === "edit"}
    <button type="submit">Update Resource</button>
  {/if} -->
  <button type="submit">{$form.id ? "Update" : "Create"}</button>
</form>
