<script lang="ts">
  import EventForm from "../EventForm.svelte";
  import type { PageProps } from "./$types";
  import InfoBoxTop from "$lib/components/InfoBoxTop.svelte";

  let { data }: PageProps = $props();
</script>

<!-- just temp until layout properly set  -->
<InfoBoxTop
  >Hello organisers! Fill this form to upload your event to the calendar.<br />
  <b>You will need a space before you create an event.</b></InfoBoxTop
>
<EventForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  spaces={data.spacesList}
  resourcesList={data.resourcesList}
  userRole={data.userRole!}
/>
