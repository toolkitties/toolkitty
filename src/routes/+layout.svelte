<script lang="ts">
  import { init } from "$lib/channel";
  import { onMount } from "svelte";

  onMount(() => {
    // Hacky workaround to only call "init" once in a Svelte HMR life-cycle.
    //
    // @TODO(adz): This might need some more investigation as it currently
    // breaks when an error was thrown. After fixing that error, HMR re-loads
    // fully and calls "init" again.
    if (!("isInit" in window)) {
      init();

      // @ts-ignore
      window.isInit = true;
    }
  });
</script>

<slot />
