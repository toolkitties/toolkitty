<!-- 
 @component
 Upload multiple images as part of a form
  -->

<script lang="ts">
  import { uploadFile } from "$lib/api/blobs";

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

<div class="grid grid-cols-3 gap-4">
  <!--
    Same images are de-duplicated on the backend and result in the same hash.
    We still want to show the same image multiple times though if the user
    wants that, this is why we're using the index as part of the key.
  -->
  {#each images as image, index (`${image}${index}`)}
    <div class="border-2 rounded-lg border-gray-200">
      <img src={`blobstore://${image}`} alt={image} />
      <button onclick={(event) => removeImage(event, index)}>Remove</button>
    </div>
  {/each}
</div>

<button onclick={(event) => selectImage(event)}>Upload image</button>
