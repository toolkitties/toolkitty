<script lang="ts">
  import { init } from "$lib/channel";
  import { onMount } from "svelte";
  import Toasts from "../components/toasts.svelte";
  import { topics } from "$lib/api";

  onMount(() => {
    // Hacky workaround to only call "init" once in a Svelte HMR life-cycle.
    //
    // @TODO(adz): This might need some more investigation as it currently
    // breaks when an error was thrown. After fixing that error, HMR re-loads
    // fully and calls "init" again.
    if (!("isInit" in window)) {
      init().then(() => {
        // After init subscribe to all calendars we know about.
        topics.subscribeToAll();
        
        // @TODO(sam): inform the backend of all authors we want to sync data with for each
        // calendar (add them to the topic map).
      });

      // @ts-ignore
      window.isInit = true;
    }
  });
</script>

<Toasts />
<slot />
