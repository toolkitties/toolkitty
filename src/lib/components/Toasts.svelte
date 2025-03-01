<script lang="ts">
  import { toast } from "$lib/toast.svelte";
  import { fly } from "svelte/transition";
  import * as Dialog from "./dialog";
  import Request from "./dialog/Request.svelte";
  import { tick } from "svelte";

  /**
   * Handle dialog opening and closing.
   *
   * When it opens we want to pause dismissal of toasts.
   * When it closes we want to immediately dismiss the toast that was associated with that dialog
   */
  function handleDialogOpenChange(open: boolean, id: number) {
    toast.autoDismiss = !open;
    if (!open) {
      // wait for next tick so dialog can dismiss with a nice transition
      tick().then(() => {
        toast.dismissToast(id);
      });
    }
  }
</script>

<section class="fixed top-8 right-0 p-3 w-full z-30">
  <ol tabIndex={-1} class="space-y-2">
    {#each toast.toasts as t}
      <li
        aria-live="polite"
        class={`toast ${t.type}`}
        transition:fly={{ y: -50, duration: 500 }}
      >
        {#if t.link}
          <!-- Its a link so we wrap in an a tag -->
          <a href={t.link} class="text-center">
            {@render toastContent(t)}
          </a>
        {:else if t.request}
          <!-- Action is required so it should open a modal -->
          <Dialog.Root
            onOpenChange={(open) => handleDialogOpenChange(open, t.id)}
          >
            <Dialog.Trigger class="button">
              {@render toastContent(t)}
            </Dialog.Trigger>
            <Request request={t.request} />
          </Dialog.Root>
        {:else}
          <!-- It's just a regular toast so we display the message -->
          {@render toastContent(t)}
        {/if}
      </li>
    {/each}
  </ol>
</section>

{#snippet toastContent(toast: { type: string; message: string })}
  <!-- TODO: use correct icons -->
  {#if toast.type == "error"}
    <span>⚠</span>
  {:else if toast.type == "success"}
    <span>✅</span>
  {/if}
  <p class="text-center">{toast.message}</p>
{/snippet}

<style>
  .toast {
    @apply flex gap-1.5 p-2.5 border-black border rounded;
  }

  .toast.error {
    @apply bg-red-light;
  }
</style>
