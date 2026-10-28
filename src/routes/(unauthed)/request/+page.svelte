<script lang="ts">
  import type { PageProps } from "./$types";
  import { goto } from "$app/navigation";
  import { access } from "$lib/api";
  import { getActiveCalendarId } from "$lib/api/calendars";
  import { toast } from "$lib/toast.svelte";
  import { onDestroy } from "svelte";
  import BubbleIcon from "$lib/components/icons/BubbleIcon.svelte";
  import Header from "$lib/components/Header.svelte";

  let { data }: PageProps = $props();
  let requestStatus = $state(data.accessStatus);
  let isSubmitting = $state(false);
  let interval: ReturnType<typeof setInterval>;

  async function updateRequestStatus() {
    if (!data.activeCalendarId) return;
    const accessStatus = await access.checkStatus(
      data.myPublicKey,
      data.activeCalendarId,
    );

    if (accessStatus === "accepted") {
      toast.success("Access accepted!");
      goto("/app/events");
    } else if (accessStatus === "rejected") {
      toast.error("Access rejected!");
      goto("/");
    }
  }

  async function join(event: Event) {
    event.preventDefault();
    if (isSubmitting) return;

    const calendarId = await getActiveCalendarId();
    if (!calendarId) {
      toast.error("Select or join a festival calendar first.");
      return;
    }

    const formData = new FormData(event.target as HTMLFormElement);
    const request = {
      calendarId,
      name: (formData.get("name") as string).trim(),
      message: (formData.get("message") as string).trim(),
    };

    isSubmitting = true;
    try {
      await access.requestAccess(request);
      requestStatus = "pending";
      interval = setInterval(() => void updateRequestStatus(), 1000);
    } catch (error) {
      console.error("Could not send access request:", error);
      toast.error("Could not send your access request. Please try again.");
    } finally {
      isSubmitting = false;
    }
  }

  onDestroy(() => clearInterval(interval));
</script>

<Header
  title={requestStatus === "pending" ? "request pending" : "request access"}
  userRole="unauthed"
/>

<main class="flex min-h-0 grow flex-col px-3.5 py-3.5">
  {#if !data.activeCalendarId}
    <h2 class="text-center">Request access</h2>
    <p>Please join or select a festival calendar before requesting access.</p>
    <a href="/join" class="button button-green mt-4 w-full justify-center"
      >Join a calendar</a
    >
  {:else}
    <h2 class="mb-4 text-center">Request Access to my festival</h2>
    {#if requestStatus === "pending"}
      <div class="flex grow items-center justify-center">
        <div class="text-center">
          <img class="mx-auto w-12" alt="" src="/images/pending.gif" />
          <span class="mt-2 block text-[20px]">Request pending...</span>
        </div>
      </div>
    {:else}
      {#if requestStatus === "rejected"}
        <p class="mt-1 text-center">
          Your previous request was rejected. You can send a new request.
        </p>
      {/if}
      <form onsubmit={join}>
        <label for="name" class="mb-2">Your name*</label>
        <input id="name" name="name" type="text" class="mb-4" required />
        <label for="message" class="mb-2 flex items-center gap-2">
          <BubbleIcon size={22} />
          Message the admins
        </label>
        <textarea
          id="message"
          name="message"
          rows="4"
          class="mb-4"
          placeholder="Message the admins: introduce yourself and let them know if you wish to be an organiser or an admin"
        ></textarea>
        <div class="flex justify-center">
          <button
            class="button button-grey"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "sending…" : "request access"}
          </button>
        </div>
      </form>
    {/if}
  {/if}
</main>
