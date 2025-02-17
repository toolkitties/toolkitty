<script lang="ts">
  import { onMount } from "svelte";
  import { findMany as findSpaces } from "$lib/api/spaces";
  import { findMany as findResources } from "$lib/api/resources";
  import AvailabilityViewer from "../../../../components/availability-viewer.svelte";

  let spaces: Space[] = [];
  let resources: Resource[] = [];

  let currentlySelectedSpaceId = "";
  let currentlySelectedResourceId = "";

  onMount(async () => {
    try {
      const [fetchedSpaces, fetchedResources] = await Promise.all([
        findSpaces(),
        findResources(),
      ]);
      spaces = [...fetchedSpaces];
      currentlySelectedSpaceId = spaces[0].id;

      resources = [...fetchedResources];
      currentlySelectedResourceId = resources[0].id;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });

  let tags = ["tag 1", "tag 2", "tag 3"];
  let tagColours = ["bg-yellow-light", "bg-fluro-green-light", "bg-red-light"];
</script>

<p>Hello organisers! Fill this form to upload your event to the program.</p>
<form>
  <label for="name">Event name*</label>
  <input type="text" name="name" />
  <label for="description">Event description*</label>
  <textarea name="description"></textarea>

  <p>🎫 Ticket Link</p>
  <div class="flex flex-row">
    <div>
      <label for="ticket-link-text">Link text</label>
      <input type="text" name="ticket-link-text" />
    </div>
    <div>
      <label for="ticket-link-url">URL</label>
      <input type="text" name="ticket-link-url" />
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
      <input type="text" name="additional-link-url" />
    </div>
  </div>

  {#if spaces.length > 0}
    <label for="select-space">Select Space</label><br />
    <select name="select-space" bind:value={currentlySelectedSpaceId}>
      {#each spaces as space}
        <option
          value={space.id}
          selected={space.id === currentlySelectedSpaceId}
        >
          {space.name}
        </option>
      {/each}
    </select>

    <div class="space-availability">
      <p>Select from available dates:</p>
      <AvailabilityViewer
        resourceId={currentlySelectedSpaceId}
        type={"space"}
      />
    </div>
  {:else}
    <p>No spaces found.</p>
  {/if}

  <p>Event time (excluding set-up)</p>

  <div class="flex flex-row">
    <p>Event start</p>
    <label for="event-name">Date *</label>
    <input name="event-name" type="date" required />
    <label for="event-start-time">Time *</label>
    <input name="event-start-time" type="time" required />
  </div>

  <div class="flex flex-row">
    <p>Event end</p>
    <label for="event-name">Date *</label>
    <input name="event-name" type="date" required />
    <label for="event-start-time">Time *</label>
    <input name="event-start-time" type="time" required />
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

  <!-- image upload component -->

  <div class="flex flex-row">
    {#each tags as tag, index}
      <div class={`tag ${tagColours[index]}`}>{tag}</div>
    {/each}
  </div>

  <button type="submit">Publish</button>
</form>
