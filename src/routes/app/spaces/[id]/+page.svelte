<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<h1>Space page</h1>

<br />
<br />
<br />
<pre>{JSON.stringify(data.space)}</pre>
{#if data.userRole == "admin"}
  <a href="/app/spaces/{data.space!.id}/edit">Edit</a>
{/if}
