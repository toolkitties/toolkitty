<!-- 
 @component
 Text for events, space and resource pages.

 Short version is rendered on the page, limited to 160 chars.
 Longer version can be opened in a modal.

  -->

<script lang="ts">
  import * as AlertDialog from "$lib/components/dialog/index";
  import PlusIcon from "./icons/plusIcon.svelte";

  let LONG_TEXT_LENGTH = 160;

  let { text, title }: { text: string; title: string } = $props();

  let open = $state(false);
  let isLong = $derived(text.length > LONG_TEXT_LENGTH);
  let shortText = $derived(
    text.substring(0, LONG_TEXT_LENGTH) + (isLong ? "..." : ""),
  );
</script>

<p>
  {shortText}
  {#if isLong}
    <AlertDialog.Root bind:open>
      <AlertDialog.Trigger class="button-small bg-pink-light"
        ><PlusIcon size={7} /> read more</AlertDialog.Trigger
      >
      <AlertDialog.Portal>
        <AlertDialog.Content>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>
            <p class="max-h-[50vh] overflow-auto">{text}</p>
          </AlertDialog.Description>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  {/if}
</p>
