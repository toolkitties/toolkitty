<!-- 
 @component
 Generic select component used in forms
  -->

<script lang="ts">
  import { Select } from "bits-ui";
  import Icon from "@iconify/svelte";

  let {
    value = $bindable(),
    items = [],
    multiple = false,
    name = "",
  } = $props();

  let isOpen = $state(true);

  let placeholder = `Select a ${name}`;
</script>

<Select.Root
  type={multiple ? "multiple" : "single"}
  open={isOpen}
  {items}
  {name}
  bind:value
>
  <div class="border border-black rounded">
    <button
      onclick={() => (isOpen = !isOpen)}
      class="border-0 rounded-b-none flex justify-between items-center"
      aria-label={placeholder}
    >
      {#if multiple}
        <span>{placeholder}</span>
      {:else}
        <p>{value}</p>
      {/if}
      <Icon icon="lucide:chevron-down" class={isOpen ? "rotate-180" : ""} />
    </button>
    <!-- <Select.Content asChild class="bg-black/10 w-full z-50"> -->
    <div
      class={`bg-black/10 max-h-60 o overflow-auto ${isOpen ? "block" : "hidden"}`}
    >
      {#each items as item (item.value)}
        <Select.Item
          disabled={item.disabled}
          class={`flex h-10 w-full select-none items-center p-2.5 ${item.disabled ? "opacity-50" : ""}`}
          value={item.value}
          label={item.label}
        >
          {#snippet children({ selected })}
            {item.label}
            {#if selected}
              <Icon icon="lucide:check" />
            {/if}
          {/snippet}
        </Select.Item>
      {/each}
    </div>
  </div>
  <!-- </Select.Content> -->
</Select.Root>
