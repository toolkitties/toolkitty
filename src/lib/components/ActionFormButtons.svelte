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
  }: {
    id: string;
    name: string;
    userRole: string;
    onSaveDraft: () => void;
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
    <button
      type="button"
      class="bg-grey-light rounded-xl justify-center"
      on:click={goBack}
    >
      cancel
    </button>
  {:else}
    <button
      type="button"
      class="bg-grey-light rounded-xl justify-center"
      on:click={goBack}
    >
      discard
    </button>
    <button
      type="button"
      class="bg-grey-light rounded-xl justify-center"
      on:click={onSaveDraft}
    >
      save draft
    </button>
  {/if}
  <button type="submit" class="bg-green-light-fluro justify-center rounded-xl">
    publish
  </button>
</div>
