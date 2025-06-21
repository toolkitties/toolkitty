<script lang="ts">
  import { PinInput, Toggle } from "bits-ui";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";
  import { resolveInviteCode } from "$lib/api/access";
  import { invalidateAll } from "$app/navigation";
  import LockIcon from "$lib/components/icons/LockIcon.svelte";
  import HideIcon from "$lib/components/icons/HideIcon.svelte";

  let value = $state("");
  let show = $state(true);
  let searching = $state(false);
  const REGEX_ONLY_CHARS_AND_DIGITS = "^[a-zA-Z0-9]+$";

  // Transform value to lowercase as the user inputs the code
  $effect(() => {
    value = value.toLowerCase();
  });

  async function join() {
    // event.preventDefault();

    if (!value) return;

    try {
      searching = true;
      await resolveInviteCode(value);
    } catch (err) {
      searching = false;
      console.error(err);
      toast.error("Calendar not found");
      return;
    }

    // reload data so we get the latest active calendar
    // TODO: move active calendar to reactive state so we don't need to do this.
    await invalidateAll();
    goto("/request");
  }
</script>

<h1 class="text-3xl text-center">Toolkitty 🐈</h1>

<div class="flex flex-col gap-4 grow justify-center mx-auto">
  {#if !searching}
    <form onsubmit={join} class="flex flex-col gap-4">
      <div class="flex items-center justify-center max-w-[158px]">
        <LockIcon />
      </div>
      <div class="flex items-center gap-2">
        <PinInput.Root
          bind:value
          maxlength={4}
          class="flex items-center gap-2"
          pattern={REGEX_ONLY_CHARS_AND_DIGITS}
          onComplete={join}
        >
          {#snippet children({ cells })}
            {#each cells as cell, i (i)}
              <PinInput.Cell
                class="flex items-center justify-center w-9 h-9 px-[10px] py-2 border border-black rounded-lg bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)] flex-none order-0 flex-grow-0 z-0"
                {cell}
              >
                {#if cell.char !== null}
                  <div>
                    {show ? cell.char : "·"}
                  </div>
                {/if}
              </PinInput.Cell>
            {/each}
          {/snippet}
        </PinInput.Root>
        <Toggle.Root
          aria-label="toggle code visibility"
          class="inline-flex items-center rounded-[9px] text-foreground/40 hover:bg-transparent active:scale-98 border-0 bg-transparent"
          bind:pressed={show}
        >
          {#if show}
            <HideIcon size={24} />
          {:else}
            <span>Show</span>
          {/if}
        </Toggle.Root>
      </div>
      <div class="flex items-center justify-center max-w-[158px]">
        <button type="submit" class="button button-light-blue max-w-fit"
          >join</button
        >
      </div>
    </form>
  {:else}
    <div>
      <img class="w-12 mx-auto" alt="searching" src="/images/searching.gif" />
      <span>searching for calendar...</span>
    </div>
  {/if}
</div>

<a href="/create" class="button button-green" type="submit"
  >+ Create new calendar</a
>
