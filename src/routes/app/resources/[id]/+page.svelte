<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<br />
<br />
<br />
<pre>{JSON.stringify(data.resource)}</pre>
<a href="/app/resources/{data.resource!.id}/edit">Edit</a>
