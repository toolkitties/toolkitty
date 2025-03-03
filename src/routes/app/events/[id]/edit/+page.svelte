<script lang="ts">
  import { EventForm } from "$lib/components/EventForm.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<br />
<br />
<br />
<EventForm
  formType="edit"
  spaces={data.spacesList}
  resources={data.resourcesList}
/>
