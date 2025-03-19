<script lang="ts">
  let {
    images = $bindable(),
  }: {
    images: string[];
  } = $props();

  images.push('1234');
</script>

{#each images as image (image)}
  {image}
{/each}
