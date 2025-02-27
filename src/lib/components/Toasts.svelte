<script lang="ts">
  import { toast } from "$lib/toast.svelte";
  import { fly } from "svelte/transition";
  import * as AlertDialog from "./dialog";
  // import Request from "./dialog/Request.svelte";
  import RequestToast from "./RequestToast.svelte";
</script>

<section class="absolute top-8 right-0 p-3 w-full">
  <ol tabIndex={-1} class="space-y-2">
    {#each toast.toasts as toastie}
      <li
        aria-live="polite"
        class={`toast ${toastie.type}`}
        transition:fly={{ y: -50, duration: 500 }}
      >
        {#if toastie.link}
          <!-- Its a link so we wrap in an a tag -->
          <a href={toastie.link} class="text-center">
            {@render toastContent(toastie)}
          </a>
        {:else if toastie.request}
          <!-- Action is required so it should open a modal -->
          <RequestToast toastie />
        {:else}
          <!-- It's just a regular toast so we display the message -->
          {@render toastContent(toastie)}
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
