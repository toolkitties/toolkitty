<script lang="ts">
  import type { PageProps } from "./$types";
  import { spaces, calendars } from "$lib/api";
  import { liveQuery } from "dexie";
  let { data }: PageProps = $props();

  let spacesList = liveQuery(() => spaces.findMany(data.activeCalendarId));

  let spacePageText = liveQuery(async () => {
    const calendar = await calendars.findById(data.activeCalendarId);
    return calendar?.spacePageText;
  });
</script>

<h1 class="font-pixel">{data.title}</h1>

{#if $spacePageText}
  <p>{$spacePageText}</p>
{/if}

<a href="#/app/spaces/create">Create space</a>
{#each $spacesList as space (space.id)}
  <a
    href={`#/app/spaces/${space.id}`}
    class="flex border-black border event-row"
  >
    <img
      src={space.images[0]}
      alt=""
      class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow"
    />
    <div class="flex flex-col gap-1 p-2">
      <h3>{space.name}</h3>
      {#if space.location.type === "gps"}
        <span>📍 {space.location.lat} / {space.location.lon}</span>
      {:else if space.location.type === "physical"}
        <span
          >📍 {space.location.street}, {space.location.city}, {space.location
            .country}</span
        >
      {:else}
        <span>📍 {space.location.link}</span>
      {/if}
      <p>{space.description}</p>
    </div>
  </a>
{/each}
