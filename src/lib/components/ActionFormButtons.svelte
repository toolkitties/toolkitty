<script lang="ts">
  import Delete from "$lib/components/dialog/Delete.svelte";

  function goBack() {
    window.history.back();
  }

  let {
    id,
    name,
    userRole,
    onSaveDraft,
    disabled = false,
  }: {
    id: string;
    name: string;
    userRole: string;
    onSaveDraft: () => void;
    disabled?: boolean;
  } = $props();
</script>

<div
  class="grid {userRole === 'admin'
    ? 'grid-cols-3'
    : id
      ? 'grid-cols-2'
      : 'grid-cols-3'} gap-2"
>
  {#if id}
    {#if userRole === "admin"}
      {console.log("User role is admin:", userRole)}
      <Delete {id} {name} type="event" />
    {/if}
    <button type="button" class="button button-grey" onclick={goBack}>
      cancel
    </button>
  {:else}
    <button type="button" class="button button-grey" onclick={goBack}>
      discard
    </button>
    <button type="button" class="button button-grey" onclick={onSaveDraft}>
      save draft
    </button>
  {/if}
  <button
    type="submit"
    class="button button-green disabled:cursor-wait disabled:opacity-60"
    {disabled}
  >
    {disabled ? "publishing…" : "publish"}
  </button>
</div>
