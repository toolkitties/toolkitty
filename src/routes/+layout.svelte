<script lang="ts">
  import { init } from "$lib/channel";
  import { onMount } from "svelte";
  import Toasts from "$lib/components/Toasts.svelte";
  import { seedData } from "$lib/api/data";
  import { db } from "$lib/db";

  onMount(() => {
    // Hacky workaround to only call "init" once in a Svelte HMR life-cycle.
    //
    // @TODO(adz): This might need some more investigation as it currently
    // breaks when an error was thrown. After fixing that error, HMR re-loads
    // fully and calls "init" again.
    if (!("isInit" in window)) {
      init().then(async () => {
        // Delete any old version of db
        await db.delete({ disableAutoOpen: false });

        // @TODO(sam): for testing publish some events to the network.
        await seedData();

        // @TODO(sam): we have no persistence layer at the moment so we don't need to subscribe to
        // calendars we already know about.
      });

      // @ts-expect-error isInit does not exist on window
      window.isInit = true;
    }
  });
</script>

<Toasts />
<slot />
