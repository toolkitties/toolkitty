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

<Select.Root {multiple} open={isOpen} {items} {name} preventScroll={false}>
  <div class="border border-black rounded">
    <button
      onclick={() => (isOpen = !isOpen)}
      class="border-0 rounded-b-none flex justify-between items-center"
      aria-label={placeholder}
    >
      {#if multiple}
        <span>{placeholder}</span>
      {:else}
        <Select.Value {placeholder} />
      {/if}
      <Icon icon="lucide:chevron-down" class={isOpen ? "rotate-180" : ""} />
    </button>
    <!-- <Select.Content asChild class="bg-black/10 w-full z-50"> -->
    <div
      class={`bg-black/10 max-h-60 o overflow-auto ${isOpen ? "block" : "hidden"}`}
    >
      {#each items as item}
        <Select.Item
          disabled={item.disabled}
          class={`flex h-10 w-full select-none items-center p-2.5 ${item.disabled ? "opacity-50" : ""}`}
          value={item.value}
          label={item.label}
        >
          {item.label}
          <Select.ItemIndicator class="ml-auto" asChild={false}>
            <Icon icon="lucide:check" />
          </Select.ItemIndicator>
        </Select.Item>
      {/each}
    </div>
  </div>
  <!-- </Select.Content> -->
  <Select.Input bind:value {name} />
</Select.Root>
