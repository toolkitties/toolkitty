<script lang="ts">
  import type { PageProps } from "./$types";
  import { goto } from "$app/navigation";
  import { access } from "$lib/api";
  import { getActiveCalendarId } from "$lib/api/calendars";
  import { toast } from "$lib/toast.svelte";
  import { onDestroy } from "svelte";

  let { data }: PageProps = $props();
  let requestStatus = $state(data.accessStatus);
  let interval: number;

  async function updateRequestStatus() {
    let accessStatus = await access.accessStatus(
      data.myPublicKey,
      data.activeCalendarId!,
    );

    if (accessStatus == "accepted") {
      toast.success("access accepted!");
      goto("/app/events");
    } else if (accessStatus == "rejected") {
      toast.error("access rejected!");
      goto("/");
    }
  }

  async function join(event: Event) {
    event.preventDefault();

    let calendarId = await getActiveCalendarId();

    if (calendarId == undefined) {
      console.error("active calendar not set");
      goto(`/`);
      return;
    }

    let formData = new FormData(event.target as HTMLFormElement);
    let request = {
      calendarId,
      name: formData.get("name") as string,
      message: formData.get("message") as string,
    };

    await access.requestAccess(request);
    requestStatus = "pending";

    interval = setInterval(updateRequestStatus, 1000);
  }

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<h1>Kitty Fest 25</h1>

{#if requestStatus == "pending"}
  <p>
    Your request is now pending. You will be notified when this changes. Read
    more about Toolkitties <a href="/help">here</a>.
  </p>
  <span>⏳</span>
{:else if requestStatus == "rejected"}
  <p>Your request was rejected!!</p>
{:else}
  <p>Welcome to Toolkitties</p>
  <form onsubmit={join}>
    <input id="name" name="name" type="text" placeholder="Your name" required />
    <textarea id="message" name="message" rows="4" placeholder="Your message"
    ></textarea>
    <button class="border border-black rounded p-4" type="submit"
      >Request access</button
    >
  </form>
{/if}
