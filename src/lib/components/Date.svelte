<script lang="ts">
  const { date }: { date: string } = $props();
</script>

<time datetime={date}>{new Date(date).toLocaleString()}</time>
