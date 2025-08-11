<script lang="ts">
  import EventForm from "../EventForm.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<EventForm
  data={data.form}
  activeCalendarId={data.calendarId!}
  spaces={data.spacesList}
  resourcesList={data.resourcesList}
  currentSpace={data.currentSpace}
  userRole={data.userRole!}
/>
