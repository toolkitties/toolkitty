<script lang="ts">
  import CalendarForm from "$lib/components/CalendarForm.svelte";
  import InfoBoxTop from "$lib/components/InfoBoxTop.svelte";
  import Header from "$lib/components/Header.svelte";
  import { page } from "$app/state";

  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<Header title={page.data.title} userRole={"unauthed"} />

<InfoBoxTop>
  Welcome to ToolKitties! Start here to organise your own programme.
</InfoBoxTop>
<div class="px-3.5 py-3.5">
  <CalendarForm data={data.form} />
</div>
