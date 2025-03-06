<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { calendars, identity, access } from "$lib/api";

  let loading = $state("");
  let loaded = $state(false);
  const targetLoadingString = ">₍^. .^₎<";
  let interval: number;

  $effect(() => {
    if (loaded) {
      checkAccess();
    }
  });

  async function checkAccess() {
    let activeCalendarId = await calendars.getActiveCalendarId();

    if (activeCalendarId) {
      let publicKey = await identity.publicKey();
      let accessStatus = await access.checkStatus(publicKey, activeCalendarId);

      console.log(publicKey);
      console.log(accessStatus);
      if (accessStatus == "accepted") {
        // access is accepted, go to events
        // goto("/app/events");
        // return;
      } else if (accessStatus == "pending") {
        // access status is pending, go to pending page
        goto("/request");
        return;
      }
    }
    goto("/join");
  }

  onMount(() => {
    interval = setInterval(() => {
      if (loading.length < targetLoadingString.length) {
        loading = targetLoadingString.slice(0, loading.length + 1);
      } else {
        clearInterval(interval);
        loaded = true;
      }
    }, 100);
  });
</script>

<div class="w-screen h-screen flex items-center justify-center">
  <span>{loading}</span>
</div>
