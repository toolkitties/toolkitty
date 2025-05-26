<script lang="ts">
  import ResourceForm from "../ResourceForm.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<ResourceForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  calendarDates={data.calendarDates}
  userRole={data.userRole!}
/>
