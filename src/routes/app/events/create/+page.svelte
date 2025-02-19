<script lang="ts">
  import { onMount } from "svelte";
  import { findMany as findSpaces } from "$lib/api/spaces";
  import { findMany as findResources } from "$lib/api/resources";
  import EventForm from "../../../../components/event-form.svelte";

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

<br />
<br />
<br />
<br />
<!-- just temp until layout properly set  -->
<p>Hello organisers! Fill this form to upload your event to the program.</p>
<EventForm formType="create" {spaces} {resources} />
