<script lang="ts">
  import { onMount } from "svelte";
  import { findMany } from "$lib/api/spaces";

  let spaces: Space[] = [];

  onMount(async () => {
    try {
      const fetchedSpaces = await findMany();
      spaces = [...fetchedSpaces];
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });
</script>

<br />
<br />
<br />
<h1 class="font-pixel">Spaces</h1>
<a href="/app/spaces/create">Create space</a>

{#each spaces as space}
  <a
    href={`/app/spaces/${space.id}`}
    class="flex border-black border event-row"
  >
    <img
      src={space.images[0]}
      alt=""
      class="aspect-square object-cover w-[30%] min-w-32 max-w-72 grow"
    />
    <div class="flex flex-col gap-1 p-2">
      <h3>{space.name}</h3>
      <span>📍 {space.location}</span>
      <p>{space.description}</p>
    </div>
  </a>
{/each}
