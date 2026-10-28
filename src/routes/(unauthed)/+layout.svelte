<script lang="ts">
  import type { LayoutProps } from "./$types";
  let { children }: LayoutProps = $props();
</script>

<main class="flex flex-col h-dvh grow overflow-auto">
  {@render children()}
</main>
