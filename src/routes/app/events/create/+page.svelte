<script lang="ts">
  import EventForm from "../EventForm.svelte";
  import type { PageProps } from "./$types";
  import InfoBoxTop from "$lib/components/InfoBoxTop.svelte";

  let { data }: PageProps = $props();
</script>

<div class="-mx-3.5 -mt-3.5 mb-3.5">
  <InfoBoxTop
    >Hello organisers! Fill this form to upload your event to the calendar.<br
    />
    <b>You will need a space before you create an event.</b></InfoBoxTop
  >
</div>
<EventForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  spaces={data.spacesList}
  resourcesList={data.resourcesList}
  userRole={data.userRole!}
/>
