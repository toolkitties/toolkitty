<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<pre>{JSON.stringify(data.event)}</pre>
<a href="/app/events/{data.event!.id}/edit">Edit</a>
