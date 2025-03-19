<script lang="ts">
  import type { PageProps } from "./$types";
  import { resources } from "$lib/api";
  import { liveQuery } from "dexie";

  let { data }: PageProps = $props();

  let resourcesList = liveQuery(() =>
    resources.findMany(data.activeCalendarId),
  );
</script>

<h1 class="font-pixel">{data.title}</h1>
{#if data.calendar?.resourcePageText}
  {data.calendar.resourcePageText}
{/if}
<a href="#/app/resources/create">Create resource</a>

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
