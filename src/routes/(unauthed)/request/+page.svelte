<script lang="ts">
  import type { PageProps } from "./$types";
  import { goto } from "$app/navigation";
  import { access } from "$lib/api";
  import { getActiveCalendarId } from "$lib/api/calendars";
  import { toast } from "$lib/toast.svelte";
  import { onDestroy } from "svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";

  let { data }: PageProps = $props();
  let requestStatus = $state(data.accessStatus);
  let interval: ReturnType<typeof setInterval>;

  async function updateRequestStatus() {
    let accessStatus = await access.checkStatus(
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

<div class="h-6"></div>
<CalendarSelector />
{#if requestStatus == "pending"}
  <div class="mx-auto">
    <img class="w-12 mx-auto" alt="" src="/images/pending.gif" />
    <span>request pending...</span>
  </div>
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
