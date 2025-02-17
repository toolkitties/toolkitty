<script lang="ts">
  import { onMount } from "svelte";
  import { findMany as findSpaces } from "$lib/api/spaces";
  import { findMany as findResources } from "$lib/api/resources";
  import AvailabilityViewer from "../../../../components/availability-viewer.svelte";

  let spaces: Space[] = $state<Space[]>([]);
  let resources: Resource[] = $state<Resource[]>([]);

  let selectedSpace: Space | null = $state<Space | null>(null);
  let currentlySelectedResourceId = $state("");

  onMount(async () => {
    try {
      const [fetchedSpaces, fetchedResources] = await Promise.all([
        findSpaces(),
        findResources(),
      ]);
      spaces = [...fetchedSpaces];

      if (spaces.length > 0) {
        selectedSpace = spaces[0]; // Store entire object, not just ID
      }

      resources = [...fetchedResources];

      if (resources.length > 0) {
        currentlySelectedResourceId = resources[0].id;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });

  function handleSpaceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedSpace = spaces.find((space) => space.id === target.value) ?? null;
  }
</script>

<p>Hello organisers! Fill this form to upload your event to the program.</p>

<form>
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
    <label for="select-space">Select Space</label><br />
    <select
      name="select-space"
      bind:value={selectedSpace}
      on:change={handleSpaceChange}
    >
      {#each spaces as space}
        <option value={space.id}>{space.name}</option>
      {/each}
    </select>

    {#if selectedSpace}
      <div class="space-availability">
        <p>Select from available dates:</p>
        <AvailabilityViewer
          availability={Array.isArray(selectedSpace.availability)
            ? selectedSpace.availability
            : []}
        />
      </div>
    {/if}
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

  <button type="submit">Publish</button>
</form>
