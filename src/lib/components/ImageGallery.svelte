<!--
 @component
 Render images in a nice gallery
  -->

<script lang="ts">
  import ImageIcon from "$lib/components/icons/ImageIcon.svelte";
  import { blobUrl } from "$lib/api/blobs";

  let { images = [] }: { images: Image[] } = $props();

  function imageSource(image: string): string {
    return image.startsWith("/") || /^[a-z][a-z\d+.-]*:/i.test(image)
      ? image
      : blobUrl(image);
  }
</script>

<div class="grid min-w-0 grid-cols-2 gap-2 overflow-hidden">
  {#if images.length > 0}
    {#each images as image, index (`${image}${index}`)}
      <div
        class={`flex h-64 min-w-0 items-center justify-center overflow-hidden rounded-sm border border-black bg-grey-medium ${images.length === 1 || (images.length % 2 === 1 && index === images.length - 1) ? "col-span-2" : ""}`}
      >
        <img
          class="block h-full w-full object-contain object-center"
          src={imageSource(image)}
          alt={`Image ${index + 1}`}
        />
      </div>
    {/each}
  {:else}
    <div
      class="col-span-2 flex min-h-[120px] items-center justify-center rounded bg-grey-medium-light p-2"
    >
      <ImageIcon size={16} />
    </div>
  {/if}
</div>
