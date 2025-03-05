<script lang="ts">
  import type { PageProps } from "./$types";
  import RequestDialog from "./RequestDialog.svelte";

  let { data }: PageProps = $props();
</script>

<h1>Dashboard</h1>

<section>
  <h3>Pending requests</h3>
  {#each data.pendingRequests as request}
    <RequestDialog {request} />
  {/each}
</section>
