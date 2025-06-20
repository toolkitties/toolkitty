<script lang="ts">
  import type { PageProps } from "./$types";
  import SpaceForm from "../SpaceForm.svelte";

  let { data }: PageProps = $props();
</script>

<h1 class="font-pixel">{data.title}</h1>
<p>
  Hello Organisers! Fill in this form to upload your own space. Once published,
  event organisers will be able to book your space for their events. Manage
  requests in your dashboard.
</p>
<SpaceForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  calendarDates={data.calendarDates}
  userRole={data.userRole!}
/>
