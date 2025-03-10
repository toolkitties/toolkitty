<script lang="ts">
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { ResourceSchema } from "$lib/schemas";
  import { superForm, setMessage, setError } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import { resources, calendars } from "$lib/api";
  import { resourceSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { toast } from "$lib/toast.svelte";

  let {
    data,
    activeCalendarId,
  }: { data: SuperValidated<Infer<ResourceSchema>>; activeCalendarId: Hash } =
    $props();
  let alwaysAvailable = $state(false);

  $effect(() => {
    if (alwaysAvailable) {
      $form.availability = "always";
    }
  });

  let availability: { date: string; startTime: string; endTime: string }[] =
    $state([]);

  function updateAvailability(
    newAvailability: { date: string; startTime: string; endTime: string }[],
  ) {
    const parsedAvailability = newAvailability.map(
      ({ date, startTime, endTime }) => ({
        start: new Date(`${date}T${startTime}`),
        end: new Date(`${date}T${endTime}`),
      }),
    );
    $form.availability = parsedAvailability;
  }

  const { form, errors, message, constraints, enhance } = superForm(data, {
    SPA: true,
    validators: zod(resourceSchema),
    resetForm: false,
    dataType: "json",
    // onUpdate is called when we press submit
    async onUpdate({ form }) {
      // TODO: add additional validation here
      const { id, ...payload } = form.data;
      if (id) {
        console.log("update resource");
        handleUpdateResource(id, payload);
      } else {
        console.log("create resource");
        handleCreateResource(payload);
      }
    },
  });

  async function handleCreateResource(payload: ResourceFields) {
    try {
      const response = await resources.create(activeCalendarId!, payload);
      toast.success("Resource created!");
      console.log("Resource created with ID:", response);
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
      const response = await resources.update(resourceId, payload);
      toast.success("Resource updated!");
      console.log("Resource updated", response);
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
  {#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}

  <label for="description">Description*</label>
  <textarea
    name="description"
    aria-invalid={$errors.description ? "true" : undefined}
    bind:value={$form.description}
  ></textarea>
  {#if $errors.description}<span class="invalid">{$errors.description}</span
    >{/if}

  <label for="contact">Contact Details*</label>
  <input
    type="text"
    name="contact"
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
          name="title"
          aria-invalid={$errors.link?.title ? "true" : undefined}
          bind:value={$form.link.title}
        />
      </div>
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
    {#if $errors.link}<span class="invalid">{$errors.link}</span>{/if}
  </fieldset>

  <p>Resource availability</p>
  {#if !alwaysAvailable}
    <AvailabilitySetter
      {availability}
      onUpdateAvailability={updateAvailability}
    />
  {/if}

  <label>
    <input
      type="checkbox"
      name="alwaysAvailable"
      bind:checked={alwaysAvailable}
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

  <button type="submit">{$form.id ? "Update" : "Create"}</button>
</form>
