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
  <a href={link.url} target="_blank" class="">
    <div
      class="rounded bg-blue-light p-2 py-3 flex items-center justify-center"
    >
      {#if link.type === "ticket"}
        <span class="mr-2"><TicketIcon size={22} /></span> Useful link: (website,
        social media)
      {:else}
        <span class="mr-2"><LinkIcon size={19} /></span>{link.title}: {link.url}
      {/if}
    </div>
  </a>
{/each}
