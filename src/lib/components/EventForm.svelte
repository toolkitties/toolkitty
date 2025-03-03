<script lang="ts">
  import AvailabilityViewer from "./AvailabilityViewer.svelte";
  import { parseEventFormData } from "$lib/utils";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";

  let { formType, spaces, resources, event = null } = $props();

  // let selectedSpace: Space | null = $state<Space | null>(null);
  // function handleSpaceSelection(space: Space) {
  //   selectedSpace = space;
  // }

  function handleSubmit(e: Event) {
    if (formType === "create") {
      handleCreateEvent(e);
    } else if (formType === "edit") {
      handleUpdateEvent(e);
    }
  }

  async function handleCreateEvent(e: Event) {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    // const payload = parseEventFormData(formData,);

    // try {
    //   await spaces.create(payload);
    //   toast.success("Event created!");
    //   goto(`/app/events/${event.id}`);
    // } catch (error) {
    //   console.error("Error creating event: ", error);
    //   toast.error("Error creating event!");
    // }
  }

  async function handleUpdateEvent(e: Event) {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    // const payload = const payload = parseEventFormData(formData);;

    // try {
    //   await spaces.update(event.id, payload);
    //   toast.success("Event updated!");
    //   goto(`/app/events/${event.id}`);
    // } catch (error) {
    //   console.error("Error updating event: ", error);
    //   toast.error("Error updating event!");
  }
</script>

<form onsubmit={handleSubmit}>
  {#if event}
    <input type="text" bind:value={event.id} />
  {/if}
  <label for="name">Event name*</label>
  <input type="text" name="name" required />

  <label for="description">Event description*</label>
  <textarea name="description" required></textarea>

  <p>🎫 Ticket Link</p>
  <div class="flex flex-row">
    <div>
      <label for="ticket-link-text">Link text</label>
      <input type="text" name="ticket-link-text" />
    </div>
    <div>
      <label for="ticket-link-url">URL</label>
      <input type="url" name="ticket-link-url" />
    </div>
  </div>

  <p>🔗 Additional Link</p>
  <div class="flex flex-row">
    <div>
      <label for="additional-link-text">Link text</label>
      <input type="text" name="additional-link-text" />
    </div>
    <div>
      <label for="additional-link-url">URL</label>
      <input type="url" name="additional-link-url" />
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

    <!-- {#if selectedSpace}
      <div class="space-availability">
        <p>View availability</p>
        <AvailabilityViewer
          availability={Array.isArray(selectedSpace.availability)
            ? selectedSpace.availability
            : []}
          multiBookable={selectedSpace.multiBookable}
        />
      </div>
    {/if} -->
    <p>Request selected space</p>
    <div class="flex flex-row">
      <p>Access from:</p>
      <label for="event-start-date">Date *</label>
      <input name="event-start-date" type="date" required />
      <label for="event-start-time">Time *</label>
      <input name="event-start-time" type="time" required />
    </div>

    <div class="flex flex-row">
      <p>Leave by:</p>
      <label for="event-end-date">Date *</label>
      <input name="event-end-date" type="date" required />
      <label for="event-end-time">Time *</label>
      <input name="event-end-time" type="time" required />
    </div>
  {:else}
    <p>No spaces found.</p>
  {/if}

  <p>Event time (excluding set-up)</p>
  <div class="flex flex-row">
    <p>Event start</p>
    <label for="event-start-date">Date *</label>
    <input name="event-start-date" type="date" required />
    <label for="event-start-time">Time *</label>
    <input name="event-start-time" type="time" required />
  </div>

  <div class="flex flex-row">
    <p>Event end</p>
    <label for="event-end-date">Date *</label>
    <input name="event-end-date" type="date" required />
    <label for="event-end-time">Time *</label>
    <input name="event-end-time" type="time" required />
  </div>

  <!-- @TODO - validate against space availability -->
  {#if resources.length > 0}
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
  {/if}

  {#if formType === "create"}
    <button type="submit">Create Event</button>
  {/if}
  {#if formType === "edit"}
    <button type="submit">Update Event</button>
  {/if}
</form>
