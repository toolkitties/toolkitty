<!--
 @component
 Generic component for rendering a list of links.
  -->

<script lang="ts">
  import type { Link } from "$lib/types";
  let { links }: { links: Link[] } = $props();
  import TicketIcon from "./icons/TicketIcon.svelte";
  import LinkIcon from "./icons/LinkIcon.svelte";
</script>

{#each links as link, i (i)}
  <a href={link.url} target="_blank" class="">
    <div
      class="rounded p-2 py-3 flex items-center justify-between {link.type ===
      'ticket'
        ? 'bg-light-yellow'
        : 'bg-blue-light'}"
    >
      <span class="mr-2 flex items-center gap-1">
        {#if link.type === "ticket"}
          <div class="mr-1">
            <TicketIcon size={22} />
          </div>
          Ticket Link:
        {:else}
          <div class="mr-1">
            <LinkIcon size={25} />
          </div>
          Useful link:
        {/if}
      </span>
      <span>
        {#if link.title?.trim()}{link.title}:&nbsp;{/if}{link.url}
      </span>
    </div>
  </a>
{/each}
