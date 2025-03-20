<script lang="ts">
  let { images }: { images: string[] } = $props();
</script>

<div class="grid grid-flow-col gap-4">
  {#each images as image, index (`${image}${index}`)}
    <img class="rounded-lg" src={`blobstore://${image}`} alt={image} />
  {/each}
</div>
