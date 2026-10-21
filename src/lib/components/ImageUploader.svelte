<!--
 @component
 Upload multiple images as part of a form
  -->

<script lang="ts">
  import { blobUrl, uploadFiles } from "$lib/api/blobs";
  import UploadIcon from "$lib/components/icons/UploadIcon.svelte";
  import { toast } from "$lib/toast.svelte";

  let {
    images = $bindable(),
  }: {
    images: Image[];
  } = $props();

  let uploadingSlot: number | undefined = $state();

  async function selectImages(index: number) {
    if (uploadingSlot !== undefined || images.length >= 3) return;

    uploadingSlot = index;
    try {
      const selectedImages = await uploadFiles();
      const availableSlots = 3 - images.length;
      images = [...images, ...selectedImages.slice(0, availableSlots)];

      if (selectedImages.length > availableSlots) {
        toast.error("You can add up to 3 images");
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Images could not be uploaded");
    } finally {
      uploadingSlot = undefined;
    }
  }

  function removeImage(index: number) {
    images = images.filter((_, i) => index !== i);
  }
</script>

<div class="space-y-2">
  <h3 class="mt-4 text-center">Add images</h3>

  <div
    class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 overflow-hidden"
  >
    {#each [0, 1, 2] as index (index)}
      <div
        class={index === 0
          ? "min-w-0 overflow-hidden aspect-square"
          : index === 1
            ? "min-w-0 overflow-hidden aspect-square"
            : "col-span-2 min-w-0 overflow-hidden aspect-[7/3]"}
      >
        {#if images[index]}
          <!-- Existing image slot -->
          <div
            class="relative flex h-full w-full items-center justify-center overflow-hidden rounded border border-black bg-grey-medium"
          >
            <img
              src={blobUrl(images[index])}
              alt={`Uploaded image ${index + 1}`}
              class="block h-full w-full object-contain object-center"
            />
            <button
              type="button"
              class="absolute bottom-1 right-1 inline-flex items-center rounded-full border border-black bg-white px-2 py-[2px] text-[11px] leading-none"
              onclick={() => removeImage(index)}
            >
              remove
            </button>
          </div>
        {:else}
          <!-- Empty slot with upload UI -->
          <button
            type="button"
            disabled={uploadingSlot !== undefined}
            aria-label={`Upload one or more images, starting at slot ${index + 1}`}
            class="flex h-full w-full flex-col items-center justify-center rounded border border-black bg-grey-medium"
            onclick={() => selectImages(index)}
          >
            <div
              class="mb-2 rounded-lg border border-black bg-white px-3 py-[3px] inline-flex items-center gap-1"
            >
              <UploadIcon size={16} />
              <span class="text-xs leading-none"
                >{uploadingSlot === index ? "uploading…" : "upload"}</span
              >
            </div>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>
