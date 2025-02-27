<script lang="ts">
  import { onMount } from "svelte";
  import { findMany as findSpaces } from "$lib/api/spaces";
  import { findMany as findResources } from "$lib/api/resources";
  import EventForm from "$lib/components/EventForm.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let spaces: Space[] = $state<Space[]>([]);
  let resources: Resource[] = $state<Resource[]>([]);

  onMount(async () => {
    try {
      const [fetchedSpaces, fetchedResources] = await Promise.all([
        findSpaces(),
        findResources(),
      ]);
      spaces = [...fetchedSpaces];

      resources = [...fetchedResources];
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });
</script>

<pre>{JSON.stringify(data.event)}</pre>

<br />
<br />
<br />
<br />
<!-- ^ just temp until layout properly set  -->
<EventForm formType="edit" {spaces} {resources} />
