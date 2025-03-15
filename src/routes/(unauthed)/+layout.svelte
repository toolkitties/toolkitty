<script lang="ts">
  import type { LayoutProps } from "./$types";
  import Back from "$lib/components/Back.svelte";
  import { page } from "$app/state";

  let indexPage = $derived(page.url.pathname == "/");

  let { children }: LayoutProps = $props();
</script>

<main class="p-8 flex flex-col gap-4 h-dvh">
  <!-- TODO: move to header component -->
  {#if !indexPage}
    <div class="fixed top-2 left-2">
      <Back />
    </div>
  {/if}
  {@render children()}
</main>
