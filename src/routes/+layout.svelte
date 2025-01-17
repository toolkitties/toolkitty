<script lang="ts">
  import { init } from "$lib/channel";
  import { onMount } from "svelte";
  import { db } from "$lib/db";
  import { liveQuery } from "dexie";

  let calendars = liveQuery(() => db.calendars.toArray());
  let events = liveQuery(() => db.events.toArray());
  calendars.subscribe((value) => {
    console.log("Calendars changed");
    console.log(value);
  });
  events.subscribe((value) => {
    console.log("Events changed");
    console.log(value);
  });

  // db.delete({ disableAutoOpen: false });

  console.log("Full URL:", window.location.href);

  console.log("yo");
  onMount(() => {
    if (!("isInit" in window)) {
      init();
      window.isInit = true;
    }
  });
</script>

<slot />
