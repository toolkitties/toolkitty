<!-- 
 @component
 Render images in a nice gallery
  -->

<script lang="ts">
  import ImageIcon from "$lib/components/icons/ImageIcon.svelte";

  let { images = [] }: { images: Image[] } = $props();
</script>

<div class="grid grid-flow-col gap-4">
  {#if images.length > 0}
    {#each images as image, index (`${image}${index}`)}
      <img class="rounded-lg" src={`${image}`} alt={`Image ${index + 1}`} />
    {/each}
  {:else}
    <div
      class="flex justify-center items-center bg-grey-medium-light p-2 rounded min-h-[120px]"
    >
      <ImageIcon size={16} />
    </div>
  {/if}
</div>
