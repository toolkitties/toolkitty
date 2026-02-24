<script lang="ts">
  import type { PageProps } from "./$types";
  import SpaceForm from "../SpaceForm.svelte";
  import InfoBoxTop from "$lib/components/InfoBoxTop.svelte";

  let { data }: PageProps = $props();
</script>

<InfoBoxTop
  >Hello Organisers! Fill in this form to upload your own space. Once published,
  event organisers will be able to book your space for their events. Manage
  requests in your dashboard.</InfoBoxTop
>

<h1 class="font-pixel">{data.title}</h1>

<SpaceForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  calendarDates={data.calendarDates}
  userRole={data.userRole!}
/>
