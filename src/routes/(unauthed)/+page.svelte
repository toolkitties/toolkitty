<script lang="ts">
  import { PinInput, Toggle } from "bits-ui";
  import { goto } from "$app/navigation";
  import { inviteCodes, calendars, topics } from "$lib/api";
  import { db } from "$lib/db";
  import { appConfigDir } from "@tauri-apps/api/path";
  import { joinWithInviteCode } from "$lib/api/onboarding";
  import { toast } from "$lib/toast.svelte";
  import { resolveInviteCode } from "$lib/api/access";
  import ArrowIcon from "../../components/icons/arrowIcon.svelte";
  import BasketIcon from "../../components/icons/basketIcon.svelte";
  import BinIcon from "../../components/icons/binIcon.svelte";
  import CalendarIcon from "../../components/icons/calendarIcon.svelte";
  import ChatBubbleIcon from "../../components/icons/chatBubbleIcon.svelte";
  import CheckIcon from "../../components/icons/checkIcon.svelte";
  import ChevronFilledRightIcon from "../../components/icons/chevronFilledRightIcon.svelte";
  import ChevronIcon from "../../components/icons/chevronIcon.svelte";
  import ChevronLeftIcon from "../../components/icons/chevronLeftIcon.svelte";
  import ChevronRightIcon from "../../components/icons/chevronRightIcon.svelte";
  import ClockIcon from "../../components/icons/clockIcon.svelte";
  import CrayonIcon from "../../components/icons/crayonIcon.svelte";
  import CrossIcon from "../../components/icons/crossIcon.svelte";
  import DashboardIcon from "../../components/icons/dashboardIcon.svelte";
  import DotdotdotIcon from "../../components/icons/dotdotdotIcon.svelte";
  import ExclamationIcon from "../../components/icons/exclamationIcon.svelte";
  import FootstepsIcon from "../../components/icons/footstepsIcon.svelte";
  import HideIcon from "../../components/icons/hideIcon.svelte";
  import HouseIcon from "../../components/icons/houseIcon.svelte";
  import ImageIcon from "../../components/icons/imageIcon.svelte";
  import LinkIcon from "../../components/icons/linkIcon.svelte";
  import LockIcon from "../../components/icons/lockIcon.svelte";
  import MailIcon from "../../components/icons/mailIcon.svelte";
  import PinIcon from "../../components/icons/pinIcon.svelte";
  import PlusIcon from "../../components/icons/plusIcon.svelte";
  import QuestionIcon from "../../components/icons/questionIcon.svelte";
  import RefreshIcon from "../../components/icons/refreshIcon.svelte";
  import ShareIcon from "../../components/icons/shareIcon.svelte";
  import SuitcaseIcon from "../../components/icons/suitcaseIcon.svelte";
  import TicketIcon from "../../components/icons/ticketIcon.svelte";
  import UploadIcon from "../../components/icons/uploadIcon.svelte";
  import WatchIcon from "../../components/icons/watchIcon.svelte";
  import BubbleIcon from "../../components/icons/bubbleIcon.svelte";
  import ChestIcon from "../../components/icons/chestIcon.svelte";

  let value: string[] | undefined = [];

  let unlocked = true;
  let progress: "dormant" | "pending" = "dormant";
  let timedOut: boolean = false;
  let pinInputType: "text" | "password" = "password";
  $: pinInputType = unlocked ? "text" : "password";

  // db.delete({ disableAutoOpen: false });

  async function join(event: Event) {
    event.preventDefault();

    if (!value) return;

    let calendar;
    try {
      progress = "pending";
      calendar = await resolveInviteCode(value.join(""));
      await topics.subscribe(calendar.id, "inbox");
      await calendars.select(calendar.id);
    } catch (err) {
      timedOut = true;
      progress = "dormant";
      console.error(err);
      toast.error("Calendar not found");
      return;
    }

    goto(`/join?code=${calendar.id}`);
  }
</script>

<h1 class="text-3xl text-center">Toolkitty 🐈</h1>

<form class="flex flex-col gap-4 grow justify-center mx-auto" onsubmit={join}>
  <div class="grid grid-cols-10 gap-4">
    <ArrowIcon />
    <BasketIcon />
    <BinIcon />
    <BubbleIcon />
    <CalendarIcon />
    <ChatBubbleIcon />
    <CheckIcon />
    <ChestIcon />
    <ChevronFilledRightIcon />
    <ChevronIcon />
    <ChevronLeftIcon />
    <ChevronRightIcon />
    <ClockIcon />
    <CrayonIcon />
    <CrossIcon />
    <DashboardIcon />
    <DotdotdotIcon />
    <ExclamationIcon />
    <FootstepsIcon />
    <HideIcon />
    <HouseIcon />
    <ImageIcon />
    <LinkIcon />
    <LockIcon />
    <MailIcon />
    <PinIcon />
    <PlusIcon />
    <QuestionIcon />
    <RefreshIcon />
    <ShareIcon />
    <SuitcaseIcon />
    <TicketIcon />
    <UploadIcon />
    <WatchIcon />
  </div>

  {#if progress == "dormant"}
    <PinInput.Root
      bind:value
      class="flex items-center gap-2"
      type={pinInputType}
      placeholder="0"
    >
      <PinInput.Input
        class="flex h-input w-10 select-none rounded-input border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
      />
      <PinInput.Input
        class="flex h-input w-10 select-none rounded-input border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
      />
      <PinInput.Input
        class="flex h-input w-10 select-none rounded-input border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
      />
      <PinInput.Input
        class="flex h-input w-10 select-none rounded-input border border-foreground bg-background px-2 py-3 text-center font-alt text-[17px] tracking-[0.01em] text-foreground placeholder-shown:border-border-input focus-within:border-border-input-hover focus-within:shadow-date-field-focus hover:border-border-input-hover"
      />
      <PinInput.HiddenInput />
      <Toggle.Root
        aria-label="toggle code visibility"
        class="inline-flex size-10 items-center justify-center rounded-[9px] text-foreground/40 transition-all hover:bg-muted active:scale-98 active:bg-dark-10 active:data-[state=on]:bg-dark-10"
        bind:pressed={unlocked}
      >
        {#if unlocked}
          <span>Hide</span>
        {:else}
          <span>Show</span>
        {/if}
      </Toggle.Root>
    </PinInput.Root>
    <button class="border border-black rounded p-4" type="submit">Join</button>
  {:else if progress == "pending"}
    <p>Searching for calendar</p>
  {/if}
</form>

{#if timedOut}
  <p>Calendar not found</p>
{/if}

<a
  href="/create"
  class="border border-black rounded p-4 text-center"
  type="submit">Create</a
>
