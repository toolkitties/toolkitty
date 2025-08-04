<script lang="ts">
  import type { PageProps } from "./$types";
  import { spaces, calendars } from "$lib/api";
  import { liveQuery } from "dexie";
  let { data }: PageProps = $props();
  import PageText from "$lib/components/PageText.svelte";
  import Contribute from "$lib/components/Contribute.svelte";

  let spacesList = liveQuery(() => spaces.findMany(data.activeCalendarId));

  let spacePageText = liveQuery(async () => {
    const calendar = await calendars.findById(data.activeCalendarId);
    return calendar?.spacePageText;
  });
</script>

<div class="-mx-3.5">
  {#if $spacePageText}
    <div class="text-center mb-4">
      <PageText text={$spacePageText} title="About spaces" />
    </div>
  {/if}

  {#if $spacesList && $spacesList.length > 0}
    {#each $spacesList as space, i (space.id)}
      <a
        href={`/app/spaces/view?id=${space.id}`}
        class="flex border-black border event-row border-b-0 border-l-0 border-r-0 border-t space-row"
      >
        {#if space.images.length > 0}
          <img
            src={`blobstore://${space.images[0]}`}
            class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow border-r"
            alt=""
          />
        {:else}
          <img
            src="/toolkitty-mascot.png"
            class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow border-r border-black"
            alt=""
          />
        {/if}
        <div class="flex flex-col p-2 pt-0.5 w-full bg-light-yellow">
          <h3>{space.name}</h3>
          {#if space.location.type === "gps"}
            <span>📍 {space.location.lat} / {space.location.lon}</span>
          {:else if space.location.type === "physical"}
            <span
              >📍 {space.location.street}, {space.location.city}, {space
                .location.country}</span
            >
          {:else}
            <span class="text-[14px]">📍 {space.location.link}</span>
          {/if}
          <p class="text-xs italic mt-1.5">
            {space.description}
          </p>
        </div>
      </a>
    {/each}
  {:else}
    <div class="flex flex-col items-center justify-center m-8">
      <p>No spaces yet, please create one.</p>
      <a href="/app/spaces/create" class="button button-green inline-block"
        >create space</a
      >
    </div>
  {/if}
</div>

<Contribute />

<style>
  .space-row:last-child {
    border-bottom: 1px solid black;
  }
</style>
