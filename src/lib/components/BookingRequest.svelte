<script lang="ts">
  let { request }: { request: BookingRequestEnriched } = $props();
  import FootstepsIcon from "$lib/components/icons/FootstepsIcon.svelte";
  import ChestIcon from "$lib/components/icons/ChestIcon.svelte";
</script>

<div
  class="border border-black rounded p-2 flex justify-between w-full text-left"
>
  {#if request.resourceType === "resource"}
    <div class="flex gap-2 items-center">
      <ChestIcon size={22} />
      <span
        >{request.resource?.name ? request.resource?.name : "No name yet"}
      </span>
    </div>
  {:else}
    <div class="flex gap-2 items-center">
      <FootstepsIcon size={22} />
      <span>{request.space?.name ? request.space?.name : "No name yet"}</span>
    </div>
  {/if}
  <span
    class={`border border-black rounded px-2 ${
      request.status === "accepted" ? "bg-green-light-fluro" : "bg-red-light"
    }`}>{request.status}</span
  >
</div>
