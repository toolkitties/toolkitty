<script lang="ts">
  import DOMPurify from "dompurify";
  import { marked } from "marked";

  let { content }: { content: string } = $props();

  const html = $derived(
    DOMPurify.sanitize(marked.parse(content, { async: false }) as string),
  );
</script>

<!-- HTML is sanitized with DOMPurify before rendering. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<div class="markdown">{@html html}</div>

<style>
  .markdown :global(p) {
    margin: 0.5rem 0;
  }

  .markdown :global(p:first-child) {
    margin-top: 0;
  }

  .markdown :global(p:last-child) {
    margin-bottom: 0;
  }

  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3) {
    margin: 1rem 0 0.5rem;
    font-weight: bold;
    text-transform: none;
  }

  .markdown :global(ul) {
    width: fit-content;
    margin: 0.5rem auto;
    padding-left: 1.5rem;
    text-align: left;
    list-style: disc;
  }

  .markdown :global(ol) {
    width: fit-content;
    margin: 0.5rem auto;
    padding-left: 1.5rem;
    text-align: left;
    list-style: decimal;
  }

  .markdown :global(a) {
    color: var(--color-blue);
    text-decoration: underline;
  }

  .markdown :global(blockquote) {
    margin: 0.75rem 0;
    padding-left: 0.75rem;
    border-left: 3px solid var(--color-grey-medium-light);
  }

  .markdown :global(code) {
    padding: 0.1rem 0.25rem;
    background: var(--color-grey-light);
  }

  .markdown :global(pre) {
    text-align: left;
  }
</style>
