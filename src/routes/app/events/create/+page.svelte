<script lang="ts">
  import EventForm from "../EventForm.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<br />
<br />
<br />
<br />
<!-- just temp until layout properly set  -->
<p>Hello organisers! Fill this form to upload your event to the program.</p>
<EventForm
  formType="create"
  spaces={data.spacesList}
  resources={data.resourcesList}
/>
