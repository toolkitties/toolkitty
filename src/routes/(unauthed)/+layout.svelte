<script lang="ts">
  import type { LayoutProps } from "./$types";
  import Back from "$lib/components/Back.svelte";

  let { data, children }: LayoutProps = $props();
</script>

<main class="pt-8 flex flex-col gap-2 h-dvh grow overflow-auto px-3.5">
  <!-- TODO: improve conditional for showing back button. -->
  {#if data.activeCalendarId}
    <div class="fixed top-2 left-2">
      <Back />
    </div>
  {/if}
  {@render children()}
</main>
