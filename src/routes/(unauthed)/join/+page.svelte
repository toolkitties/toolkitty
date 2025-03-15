<script lang="ts">
  import { PinInput, Toggle } from "bits-ui";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";
  import { resolveInviteCode } from "$lib/api/access";

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

    goto(`#/request`);
  }
</script>

<h1 class="text-3xl text-center">Toolkitty 🐈</h1>

<div class="flex flex-col gap-4 grow justify-center mx-auto">
  {#if !searching}
    <!-- TODO: Make this a form for better semantics -->
    <PinInput.Root
      bind:value
      class="flex items-center gap-2"
      maxlength={4}
      pattern={REGEX_ONLY_CHARS_AND_DIGITS}
      onComplete={join}
    >
      {#snippet children({ cells })}
        {#each cells as cell, i (i)}
          <PinInput.Cell
            class="flex items-center justify-center h-16 w-10 border rounded data-active:outline-primary data-active:outline-1"
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
      class="inline-flex size-10 items-center justify-center rounded-[9px] text-foreground/40 transition-all hover:bg-muted active:scale-98 active:bg-dark-10 active:data-[state=on]:bg-dark-10"
      bind:pressed={show}
    >
      {#if show}
        <span>Hide</span>
      {:else}
        <span>Show</span>
      {/if}
    </Toggle.Root>
    <button class="border border-black rounded p-4" onclick={() => join()}
      >Join</button
    >
  {:else}
    <p>Searching for calendar</p>
  {/if}
</div>

<a
  href="/create"
  class="border border-black rounded p-4 text-center"
  type="submit">Create</a
>
