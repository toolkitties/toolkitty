<script lang="ts">
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { ResourceSchema } from "$lib/schemas";
  import { superForm } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import ImageUploader from "$lib/components/ImageUploader.svelte";
  import { resources } from "$lib/api";
  import { resourceSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";

  let {
    data,
    activeCalendarId,
    calendarDates,
  }: {
    data: SuperValidated<Infer<ResourceSchema>>;
    activeCalendarId: Hash;
    calendarDates: TimeSpan;
  } = $props();
  let alwaysAvailable: boolean = $state(data.data.availability === "always");

  const { form, errors, enhance } = superForm(data, {
    SPA: true,
    validators: zod(resourceSchema),
    resetForm: false,
    dataType: "json",
    // onUpdate is called when we press submit
    async onUpdate({ form }) {
      if (form.valid) {
        // TODO: add additional validation here
        const { id, ...payload } = form.data;

        // Strip out link if url is undefined or empty string
        if (payload.link?.url === "") {
          delete payload.link;
        }
        if (id) {
          console.log("update resource");
          handleUpdateResource(id, payload);
        } else {
          console.log("create resource");
          handleCreateResource(payload);
        }
      }
    },
  });

  async function handleCreateResource(payload: ResourceFields) {
    try {
      const resourceId: Hash = await resources.create(
        activeCalendarId,
        payload,
      );
      toast.success("Resource created!");
      goto(`/app/resources/view?id=${resourceId}`);
    } catch (error) {
      toast.error("Error creating resource!");
      console.error("Error creating resource:", error);
    }
  }

  async function handleUpdateResource(
    resourceId: Hash,
    payload: ResourceFields,
  ) {
    try {
      await resources.update(resourceId, payload);
      toast.success("Resource updated!");
      goto(`/app/resources/view?id=${resourceId}`);
    } catch (error) {
      toast.error("Error updating resource!");
      console.error("Error updating resource:", error);
    }
  }
</script>

<SuperDebug data={{ $form, $errors }} />
<form method="POST" use:enhance>
  <label for="name">Resource Name*</label>
  <input
    type="text"
    name="name"
    bind:value={$form.name}
    class=""
    aria-invalid={$errors.name ? "true" : undefined}
  />
  {#if $errors.name}<span class="form-error">{$errors.name}</span>{/if}

  <label for="description">Description*</label>
  <textarea
    name="description"
    aria-invalid={$errors.description ? "true" : undefined}
    bind:value={$form.description}
  ></textarea>
  {#if $errors.description}<span class="form-error">{$errors.description}</span
    >{/if}

  <label for="contact">Contact Details*</label>
  <input
    type="text"
    name="contact"
    aria-invalid={$errors.contact ? "true" : undefined}
    bind:value={$form.contact}
  />
  {#if $errors.contact}<span class="form-error">{$errors.contact}</span>{/if}

  <fieldset>
    <legend>🔗 Useful link (website, social media)</legend>
    <div class="flex flex-row">
      <div>
        <label for="link-text">Link Title</label>
        <input
          type="text"
          name="title"
          aria-invalid={$errors.link?.title ? "true" : undefined}
          bind:value={$form.link.title}
        />
      </div>
      {#if $errors.link?.title}<span class="form-error"
          >{$errors.link.title}</span
        >{/if}
      <div>
        <label for="link-url">URL</label>
        <input
          type="url"
          name="link-url"
          aria-invalid={$errors.link?.url ? "true" : undefined}
          bind:value={$form.link.url}
        />
      </div>
    </div>
    {#if $errors.link?.url}<span class="form-error">{$errors.link.url}</span
      >{/if}
  </fieldset>

  <p>Resource availability</p>
  {#if $form.availability === "always"}
    <p>This resource is always available</p>
  {/if}
  {#if $form.availability !== "always"}
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
        } else {
          $form.availability = [];
        }
      }}
    />
    Always Available
  </label>

  <fieldset>
    <label for="multiBookable"
      >Can this resource have multiple bookings at the same time?
    </label>
    <input
      id="multiBookable"
      type="checkbox"
      name="multiBookable"
      bind:checked={$form.multiBookable}
    />
  </fieldset>

  <p>Images</p>
  <ImageUploader bind:images={$form.images as string[]} />

  <br />

  <button type="submit">{$form.id ? "Update" : "Create"}</button>
</form>
