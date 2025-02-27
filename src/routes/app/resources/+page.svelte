<script lang="ts">
  import { onMount } from "svelte";
  import { findMany } from "$lib/api/resources";

  let resources: Resource[] = [];

  onMount(async () => {
    try {
      const fetchedresources = await findMany();
      resources = [...fetchedresources];
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });
</script>

<br />
<br />
<br />
<h1 class="font-pixel">Spaces</h1>
<a href="/app/resources/create">Create resource</a>

{#each resources as resource}
  <a
    href={`/app/spaces/${resource.id}`}
    class="flex border-black border event-row"
  >
    <img
      src={resource.images[0]}
      alt=""
      class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow"
    />
    <div class="flex flex-col gap-1 p-2">
      <h3>{resource.name}</h3>
      <p>{resource.description}</p>
    </div>
  </a>
{/each}
