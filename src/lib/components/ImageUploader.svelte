<!--
 @component
 Upload multiple images as part of a form
  -->

<script lang="ts">
  import { uploadFile } from "$lib/api/blobs";
  import UploadIcon from "$lib/components/icons/UploadIcon.svelte";

  let {
    images = $bindable(),
  }: {
    images: Image[];
  } = $props();

  async function selectImage(event: Event) {
    // FIXME(adz): Note sure why we need to do this as this is strictly
    // speaking not a submit event, but without it it causes superform to
    // submit the whole thing.
    event.preventDefault();

    const image = await uploadFile();
    images = [...images, image];
  }

  function removeImage(event: Event, index: number) {
    event.preventDefault();
    images = images.filter((_, i) => index != i);
  }
</script>

<div class="space-y-2">
  <h3 class="text-center">Add images</h3>

  <div class="grid grid-cols-[1fr_1.4fr] gap-2">
    {#each [0, 1, 2] as index (index)}
      <div
        class={index === 0
          ? "aspect-square"
          : index === 1
            ? "aspect-[3/2]"
            : "col-span-2 aspect-[7/3]"}
      >
        {#if images[index]}
          <!-- Existing image slot -->
          <div
            class="relative h-full w-full overflow-hidden rounded border border-black bg-grey-medium"
          >
            <img
              src={`blobstore://${images[index]}`}
              alt={images[index]}
              class="h-full w-full object-cover"
            />
            <button
              class="absolute bottom-1 right-1 inline-flex items-center rounded-full border border-black bg-white px-2 py-[2px] text-[11px] leading-none"
              onclick={(event) => removeImage(event, index)}
            >
              remove
            </button>
          </div>
        {:else}
          <!-- Empty slot with upload UI -->
          <button
            class="flex h-full w-full flex-col items-center justify-center rounded border border-black bg-grey-medium"
            onclick={(event) => selectImage(event)}
          >
            <div
              class="mb-2 rounded-lg border border-black bg-white px-3 py-[3px] inline-flex items-center gap-1"
            >
              <UploadIcon size={16} />
              <span class="text-xs leading-none">upload</span>
            </div>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>
