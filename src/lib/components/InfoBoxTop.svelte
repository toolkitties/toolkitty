<script lang="ts">
  import CrossIcon from "$lib/components/icons/CrossIcon.svelte";

  let isVisible: boolean = $state(true);
  let { children } = $props();

  function closeBanner() {
    isVisible = false;
  }
</script>

{#if isVisible}
  <div
    class="bg-blue-light font-mono font-size-[15px] pt-6 p-3.5 text-center relative"
  >
    <button
      onclick={closeBanner}
      class="absolute right-5 top-2 flex items-center justify-center border-0 bg-transparent color-black"
      aria-label="Close message"
    >
      <CrossIcon size={9} />
    </button>
    {@render children()}
  </div>
{/if}
