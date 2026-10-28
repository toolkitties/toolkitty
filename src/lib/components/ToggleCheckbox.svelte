<script lang="ts">
  let {
    id = "",
    name = "",
    label = "",
    checked = $bindable(false),
    className = "",
    onChange = undefined,
  }: {
    id?: string;
    name?: string;
    label: string;
    checked?: boolean;
    className?: string;
    onChange?: (checked: boolean) => void;
  } = $props();

  function handleChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    checked = target.checked;
    onChange?.(checked);
  }
</script>

<label
  for={id}
  class={`flex items-center justify-between px-2 py-1 bg-grey-medium rounded-lg border border-black cursor-pointer select-none ${className}`}
>
  <span class="font-medium">{label}</span>

  <div
    class="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center bg-white"
  >
    {#if checked}
      <div class="w-2.5 h-2.5 rounded-full bg-red-light"></div>
    {/if}
  </div>

  <input
    {id}
    type="checkbox"
    {name}
    class="hidden"
    {checked}
    onchange={handleChange}
  />
</label>
