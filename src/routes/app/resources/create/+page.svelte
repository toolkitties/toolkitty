<script lang="ts">
  import type { PageProps } from "./$types";
  import ResourceForm from "../ResourceForm.svelte";
  import InfoBoxTop from "$lib/components/InfoBoxTop.svelte";

  let { data }: PageProps = $props();
</script>

<InfoBoxTop fullBleed>
  Hello organisers! Fill this form to upload your own resources. Resources can
  range from material goods, technical support, anything you would like to
  offer. Once published, event organisers will be able to book your resources
  for their events. Manage your requests in your dashboard.
</InfoBoxTop>
<ResourceForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  calendarDates={data.calendarDates}
  userRole={data.userRole!}
/>
