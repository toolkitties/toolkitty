<script lang="ts">
  import * as AlertDialog from "$lib/components/dialog/index";

  let LONG_TEXT_LENGTH = 150;

  let { text, title }: { text: string; title: string } = $props();

  let isLong = $derived(text.length > LONG_TEXT_LENGTH);
  let shortText = $derived(
    text.substring(0, LONG_TEXT_LENGTH) + (isLong ? "..." : ""),
  );
</script>

<p>{shortText}</p>
{#if isLong}
  <AlertDialog.Root>
    <AlertDialog.Trigger class="button inline">+ read more</AlertDialog.Trigger>
    <AlertDialog.Portal>
      <AlertDialog.Content>
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description>
          <p>{text}</p>
        </AlertDialog.Description>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
{/if}
