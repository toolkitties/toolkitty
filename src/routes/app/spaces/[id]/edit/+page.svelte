<script lang="ts">
  import SpaceForm from "../../SpaceForm.svelte";
  import type { PageProps } from "./$types";
  import Delete from "$lib/components/dialog/Delete.svelte";

  let { data }: PageProps = $props();
</script>

<br />
<br />
<br />
<SpaceForm
  data={data.form}
  activeCalendarId={data.activeCalendarId}
  calendarDates={data.calendarDates}
/>
{#if data.userRole == "admin"}
  <Delete id={data.form.data.id!} name={data.form.data.name} type="space" />
{/if}
