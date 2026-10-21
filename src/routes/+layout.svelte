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
  import { toast } from "$lib/toast.svelte";
  import "../app.css";

  let { children }: LayoutProps = $props();

  onMount(async () => {
    const appWindow = window as Window & { isInit?: boolean };
    // Reattach the current processor after HMR, even when startup already ran.
    const channelReady = init();
    if (!appWindow.isInit) {
      // Mark initialization as in progress so HMR cannot start another channel.
      // Clear the flag if startup fails, allowing a retry on reload.
      appWindow.isInit = true;
      channelReady
        .then(async () => {
          if (import.meta.env.DEV && !sessionStorage.getItem("seeded_db")) {
            console.info("seeding db");

            // Delete any old version of db
            await db.delete({ disableAutoOpen: false });

            // TODO(sam): for testing publish some events to the network.
            await data.seedData();

            // invalidate all data in load functions so we get latest data that just seeded.
            await invalidateAll();

            // set session storage so we don't reseed database on HMR or page reload.
            sessionStorage.setItem("seeded_db", "true");

            console.info("finished seeding db");
          }

          if (import.meta.env.PROD) {
            // Delete frontend database for now as there is no persistence on the backend yet.
            // AS without persistence, everytime we launch app in prod we get a new publicKey and all events.
            await db.delete({ disableAutoOpen: false });
          }

          await topics.subscribeEphemeral(INVITE_TOPIC);

          // @TODO(sam): we have no persistence layer at the moment so we don't need to subscribe to
          // calendars we already know about.
        })
        .catch((error) => {
          console.error("Toolkitty initialization failed:", error);
          toast.error("Could not connect to the app backend. Restart the app.");
          delete appWindow.isInit;
        });
    } else {
      void channelReady.catch((error) =>
        console.error("Toolkitty channel unavailable:", error),
      );
    }
  });
</script>

<Toasts />
{@render children()}
