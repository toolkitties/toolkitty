<script lang="ts">
  import { init } from "$lib/channel";
  import { onMount } from "svelte";

  console.log("yo");
  onMount(() => {
    if (!("isInit" in window)) {
      init();
      window.isInit = true;
    }
  });
</script>

<slot />
