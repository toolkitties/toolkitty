<script lang="ts">
  import EventForm from "../EventForm.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<!-- just temp until layout properly set  -->
<p>Hello organisers! Fill this form to upload your event to the program.</p>
<EventForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  spaces={data.spacesList}
  resourcesList={data.resourcesList}
/>
