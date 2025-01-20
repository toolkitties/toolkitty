<script lang="ts">
  import { toast } from "$lib/toast.svelte";
  import { fly } from "svelte/transition";
</script>

<section class="absolute top-8 right-0 p-3 w-full">
  <ol tabIndex={-1} class="space-y-2">
    {#each toast.toasts as t}
      <li
        aria-live="polite"
        class={`toast ${t.type}`}
        transition:fly={{ y: -50, duration: 500 }}
      >
        {#if t.link}
          <!-- wrap toast content inside a link if there is one provided -->
          <a href={t.link} class="text-center">
            {@render toastContent(t)}
          </a>
        {:else}
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
