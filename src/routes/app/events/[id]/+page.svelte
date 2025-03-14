<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<br />
<br />
<br />
<pre>{JSON.stringify(data.event)}</pre>
{#if data.userRole == "admin"}
  <a href="/app/events/{data.event!.id}/edit">Edit</a>
{/if}
