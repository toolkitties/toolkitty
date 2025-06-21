<script lang="ts">
  import type { PageProps } from "./$types";
  import { goto } from "$app/navigation";
  import { access } from "$lib/api";
  import { getActiveCalendarId } from "$lib/api/calendars";
  import { toast } from "$lib/toast.svelte";
  import { onDestroy } from "svelte";
  import CalendarSelector from "$lib/components/CalendarSelector.svelte";
  import BubbleIcon from "$lib/components/icons/BubbleIcon.svelte";

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
      goto("/");
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
<h2 class="text-center">Request Access to my festival</h2>
<CalendarSelector />
{#if requestStatus == "pending"}
  <div class="fixed inset-0 flex items-center justify-center">
    <div class="text-center">
      <img class="w-12 mx-auto" alt="" src="/images/pending.gif" />
      <span class="block mt-2">request pending...</span>
    </div>
  </div>
{:else if requestStatus == "rejected"}
  <div class="fixed inset-0 flex items-center justify-center">
    <div class="text-center">
      <p class="block">Your request was rejected!!</p>
    </div>
  </div>
{:else}
  <div class="mt-3">
    <p class="mb-4">Welcome to Toolkitties!</p>
    <form onsubmit={join}>
      <label for="name" class="mb-2">Your name*</label>
      <input name="name" type="text" class="mb-4" />
      <label for="message" class="flex items-center gap-2 mb-2">
        <BubbleIcon size={22} />
        Message the admins
      </label>
      <textarea id="message" name="message" rows="4" class="mb-4"></textarea>
      <div class="flex justify-center">
        <button class="button button-grey" type="submit">request access</button>
      </div>
    </form>
  </div>
{/if}
