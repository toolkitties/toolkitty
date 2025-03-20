<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { calendars, identity, access } from "$lib/api";

  async function checkAccess() {
    // TODO: cache active calendar somewhere
    let activeCalendarId = await calendars.getActiveCalendarId();

    if (activeCalendarId) {
      let publicKey = await identity.publicKey();
      let accessStatus = await access.checkStatus(publicKey, activeCalendarId);

      if (accessStatus == "accepted") {
        // access is accepted, go to events
        goto("/app/events");
        return;
      } else if (accessStatus == "pending") {
        // access status is pending, go to pending page
        goto("/request");
        return;
      }
    }
    goto("/join");
  }

  // TODO: Run check access once we have successfully subscribed to channels (currently in +layout.svelte)
  onMount(() => {
    const interval = setInterval(() => {
      checkAccess();
    }, 2500);

    return () => clearInterval(interval);
  });
</script>

<div class="w-screen h-screen flex items-center justify-center">
  <img src="/images/toolkitty.gif" alt="" />
</div>
