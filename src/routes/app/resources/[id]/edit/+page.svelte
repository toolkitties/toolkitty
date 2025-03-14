<script lang="ts">
  import ResourceForm from "../../ResourceForm.svelte";
  import type { PageProps } from "./$types";
  import Delete from "$lib/components/dialog/Delete.svelte";

  let { data }: PageProps = $props();
</script>

<ResourceForm data={data.form} activeCalendarId={data.activeCalendarId!} />
{#if data.userRole === "admin"}
  <Delete id={data.form.data.id!} name={data.form.data.name} type="resource" />
{/if}
