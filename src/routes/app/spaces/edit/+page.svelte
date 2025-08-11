<script lang="ts">
  import SpaceForm from "../SpaceForm.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<SpaceForm
  data={data.form}
  activeCalendarId={data.activeCalendarId}
  calendarDates={data.calendarDates}
  userRole={data.userRole!}
/>
