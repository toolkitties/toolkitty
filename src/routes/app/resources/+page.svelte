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

<div class="-mx-3.5">
  {#if $resourcePageText}
    <div class="text-center mb-4">
      <PageText text={$resourcePageText} title="About resources" />
    </div>
  {/if}

  {#if $resourcesList && $resourcesList.length > 0}
    {#each $resourcesList as resource (resource.id)}
      <a
        href={`/app/resources/view?id=${resource.id}`}
        class="flex border-black event-row border-t resource-row bg-grey-very-light"
      >
        <div class="flex flex-col gap-1 p-2">
          <h3>{resource.name}</h3>
          <p class="text-xs italic">{resource.description}</p>
          <p class="text-xs italic mt-1 text-grey-dark">
            <!-- TODO we miss location info here in resourceData -->
            Vague location (e.g. south London) or space it belongs to
          </p>
        </div>
      </a>
    {/each}
  {:else}
    <div class="flex flex-col items-center justify-center m-8">
      <p class="mb-4 text-center">No resources yet, please create one.</p>
      <a href="/app/resources/create" class="button button-green inline-block"
        >create resource</a
      >
    </div>
  {/if}
</div>

<Contribute />

<style>
  .resource-row:last-child {
    border-bottom: 1px solid black;
  }
</style>
