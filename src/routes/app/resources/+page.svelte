<script lang="ts">
  import type { PageProps } from "./$types";
  import { resources, calendars } from "$lib/api";
  import { liveQuery } from "dexie";
  import PageText from "$lib/components/PageText.svelte";
  import Contribute from "$lib/components/Contribute.svelte";

  let { data }: PageProps = $props();

  let resourcesList = liveQuery(() =>
    resources.findMany(data.activeCalendarId),
  );

  let resourcePageText = liveQuery(async () => {
    const calendar = await calendars.findById(data.activeCalendarId);
    return calendar?.resourcePageText;
  });
</script>

<h1 class="font-pixel">{data.title}</h1>

{#if $resourcePageText}
  <PageText text={$resourcePageText} title="about resources" />
{/if}

{#if $resourcesList && $resourcesList.length > 0}
  {#each $resourcesList as resource (resource.id)}
    <a
      href={`#/app/resources/${resource.id}`}
      class="flex border-black border event-row"
    >
      <!-- <img
      src={resource.images[0]}
      alt=""
      class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow"
    /> -->
      <div class="flex flex-col gap-1 p-2">
        <h3>{resource.name}</h3>
        <p>{resource.description}</p>
      </div>
    </a>
  {/each}
{:else}
  <p>no resources yet, please create one.</p>
{/if}

<Contribute />
