<!-- 
 @component
 Generic component for rendering a list of links.
  -->

<script lang="ts">
  let { links }: { links: Link[] } = $props();
  import TicketIcon from "./icons/TicketIcon.svelte";
  import LinkIcon from "./icons/LinkIcon.svelte";
</script>

{#each links as link, i (i)}
  <a
    href={link.url}
    target="_blank"
    class="button flex w-full justify-between items-center border"
  >
    <div>
      {#if link.type === "ticket"}
        <span class="flex gap-2"><TicketIcon size={22} />ticket link: </span>
      {:else}
        <span class="flex gap-2"><LinkIcon size={22} />{link.title}: </span>
      {/if}
    </div>
    {link.url}
  </a>
{/each}
