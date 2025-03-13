<script lang="ts">
  import type { LayoutProps } from "./$types";
  import { init } from "$lib/channel";
  import { onMount } from "svelte";
  import Toasts from "$lib/components/Toasts.svelte";
  import { topics } from "$lib/api";
  import { data } from "$lib/api";
  import { db } from "$lib/db";
  import { invalidateAll } from "$app/navigation";
  import { INVITE_TOPIC } from "$lib/api/publish";
  import "../app.css";

  let { children }: LayoutProps = $props();

  onMount(async () => {
    // Hacky workaround to only call "init" once in a Svelte HMR life-cycle.
    //
    // @TODO(adz): This might need some more investigation as it currently
    // breaks when an error was thrown. After fixing that error, HMR re-loads
    // fully and calls "init" again.
    if (!("isInit" in window)) {
      init().then(async () => {
        if (import.meta.env.DEV && !sessionStorage.getItem("seeded_db")) {
          console.info("seeding db");

          // Delete any old version of db
          await db.delete({ disableAutoOpen: false });

          // TODO(sam): for testing publish some events to the network.
          await data.seedData();

          // invalidate all data in load functions so we get latest data that just seeded.
          invalidateAll();

          // set session storage so we don't reseed database on HMR or page reload.
          sessionStorage.setItem("seeded_db", "true");

          console.info("finished seeding db");
        }

        await topics.subscribeEphemeral(INVITE_TOPIC);

        // @TODO(sam): we have no persistence layer at the moment so we don't need to subscribe to
        // calendars we already know about.
      });

      // @ts-expect-error isInit does not exist on window
      window.isInit = true;
    }
  });
</script>

<Toasts />
{@render children()}
