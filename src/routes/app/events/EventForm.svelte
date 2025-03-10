<script lang="ts">
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { EventSchema } from "$lib/schemas";
  import { superForm, setMessage, setError } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";
  import { eventSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { events } from "$lib/api";

  let {
    data,
    activeCalendarId,
    spaces,
    resources,
  }: {
    data: SuperValidated<Infer<EventSchema>>;
    activeCalendarId: Hash;
    spaces: Space[];
    resources: Resource[];
  } = $props();

  let selectedSpace: Space | null = $state<Space | null>(null);
  function handleSpaceSelection(space: Space) {
    selectedSpace = space;
  }

  const { form, errors, message, constraints, enhance } = superForm(data, {
    SPA: true,
    validators: zod(eventSchema),
    resetForm: false,
    dataType: "json",
    async onUpdate({ form }) {
      const { id, ...payload } = form.data;
      if (form.data.id) {
        console.log("update event");
        handleUpdateEvent(id!, payload);
      } else {
        console.log("create space");
        handleCreateEvent(payload);
      }
    },
  });

  async function handleCreateEvent(payload: EventFields) {
    try {
      const eventId = await events.create(activeCalendarId, payload);
      toast.success("Event created!");
      goto(`/app/events/${eventId}`);
    } catch (error) {
      console.error("Error creating event: ", error);
      toast.error("Error creating event!");
    }
  }

  async function handleUpdateEvent(eventId: Hash, payload: EventFields) {
    try {
      await events.update(eventId, payload);
      toast.success("Event updated!");
      goto(`/app/events/${data.id}`);
    } catch (error) {
      console.error("Error updating event: ", error);
      toast.error("Error updating event!");
    }
  }
</script>

<SuperDebug data={{ $form, $errors }} />
<form method="POST" use:enhance>
  <label for="name">Event name*</label>
  <input type="text" name="name" required bind:value={$form.name} />

  <label for="description">Event description*</label>
  <textarea name="description" required bind:value={$form.description}
  ></textarea>

  <p>🎫 Ticket Link</p>
  <div class="flex flex-row">
    <div>
      <label for="ticket-link-text">Link text</label>
      <input
        type="text"
        name="ticket-link-text"
        bind:value={$form.links[0].title}
      />
    </div>
    <div>
      <label for="ticket-link-url">URL</label>
      <input
        type="url"
        name="ticket-link-url"
        bind:value={$form.links[0].url}
      />
    </div>
  </div>

  <p>🔗 Additional Link</p>
  <div class="flex flex-row">
    <div>
      <label for="additional-link-text">Link text</label>
      <input
        type="text"
        name="additional-link-text"
        bind:value={$form.links[1].title}
      />
    </div>
    <div>
      <label for="additional-link-url">URL</label>
      <input
        type="url"
        name="additional-link-url"
        bind:value={$form.links[1].url}
      />
    </div>
  </div>

  {#if spaces.length > 0}
    <p>Select a space:</p>
    <ul>
      {#each spaces as space}
        <li>
          <input type="radio" id={space.id} name="selected-space" />
          <label for={space.id}>{space.name}</label>
        </li>
      {/each}
    </ul>

    {#if selectedSpace}
      <div class="space-availability">
        <p>View availability</p>
        <AvailabilityViewer
          availability={Array.isArray(selectedSpace.availability)
            ? selectedSpace.availability
            : []}
          multiBookable={selectedSpace.multiBookable}
        />
      </div>
    {/if}
    <p>Request selected space</p>
    <div class="flex flex-row">
      <label for="startDate">Access Start *</label>
      <input
        type="datetime-local"
        name="startDate"
        required
        bind:value={$form.startDate}
      />

      <label for="endDate">Access End *</label>
      <input
        type="datetime-local"
        name="endDate"
        required
        bind:value={$form.endDate}
      />
    </div>
  {:else}
    <p>No spaces found.</p>
  {/if}

  <p>Event time (excluding set-up)</p>
  <div class="flex flex-row">
    <label for="publicStartDate">Event Start *</label>
    <input
      type="datetime-local"
      name="publicStartDate"
      required
      bind:value={$form.publicStartDate}
    />

    <label for="publicEndDate">Event End *</label>
    <input
      type="datetime-local"
      name="publicEndDate"
      required
      bind:value={$form.publicEndDate}
    />
  </div>

  <!-- @TODO - validate against space availability -->
  <!-- {#if resources.length > 0}
    <label for="resource-list">Select resources</label>
    <ul id="resource-list">
      {#each resources as resource}
        <li>
          <input
            type="checkbox"
            id="resource-{resource.id}"
            value={resource.id}
          />
          <label for="resource-{resource.id}">{resource.name}</label>
        </li>
      {/each}
    </ul>
  {:else}
    <p>No resources available.</p>
  {/if} -->

  <button type="submit">{$form.id ? "Update" : "Create"}</button>
</form>
