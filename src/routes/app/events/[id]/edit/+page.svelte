<script lang="ts">
  import EventForm from "../../EventForm.svelte";
  import type { PageProps } from "./$types";
  import Delete from "$lib/components/dialog/Delete.svelte";

  let { data }: PageProps = $props();
</script>

<br />
<br />
<br />
<EventForm
  data={data.form}
  activeCalendarId={data.activeCalendarId!}
  spaces={data.spacesList}
  resources={data.resourcesList}
/>
<Delete id={data.form.data.id!} name={data.form.data.name} type="event" />
