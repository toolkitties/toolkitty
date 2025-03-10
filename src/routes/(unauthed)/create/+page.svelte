<script lang="ts">
  import CalendarForm from "$lib/components/CalendarForm.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<h1>Welcome to ToolKitties! Start here to organise your own programme.</h1>
<CalendarForm data={data.form} />
