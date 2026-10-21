<script lang="ts">
  import CrossIcon from "$lib/components/icons/CrossIcon.svelte";

  let isVisible: boolean = $state(true);
  let { children, fullBleed = false } = $props();

  function closeBanner() {
    isVisible = false;
  }
</script>

{#if isVisible}
  <div
    class={`relative bg-blue-light p-3.5 pt-6 text-center font-mono text-[15px] ${fullBleed ? "-mx-3.5 -mt-3.5 mb-3.5" : ""}`}
  >
    <button
      onclick={closeBanner}
      class="absolute right-2 top-2 grid size-7 place-items-center rounded-none border-0 bg-transparent p-0 text-black"
      aria-label="Close message"
    >
      <CrossIcon size={12} />
    </button>
    {@render children()}
  </div>
{/if}
