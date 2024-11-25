<script lang="ts">
  import Back from "../../components/back.svelte";
  import Icon from "@iconify/svelte";
  import { page } from "$app/stores";

  interface MenuItem {
    name: string;
    url: string;
    icon: string;
  }

  const menu: MenuItem[] = [
    {
      name: "Calendar",
      url: "/app/events",
      icon: "lucide:calendar",
    },
    {
      name: "Spaces",
      url: "/app/spaces",
      icon: "lucide:map-pin",
    },
    {
      name: "Resources",
      url: "/app/resources",
      icon: "lucide:wrench",
    },
    {
      name: "Dashboard",
      url: "/app/dashboard",
      icon: "lucide:user",
    },
    {
      name: "Share",
      url: "/app/share",
      icon: "lucide:share-2",
    },
  ];

  let topLevelPage = $derived(
    menu.some((item) => item.url.includes($page.url.pathname)),
  );
</script>

<main class="h-dvh">
  <!-- to do: move into header component with page title -->
  <div class="fixed top-2 left-2">
    {#if !topLevelPage}
      <Back />
    {/if}
  </div>
  <slot />
  <nav class="fixed bottom-0 right-0 w-full p-2 px-4 border-t border-black">
    <ul class="flex justify-between items-center h-full">
      {#each menu as item}
        <li>
          <a
            href={item.url}
            class="block"
            class:active={$page.url.pathname.includes(item.url)}
          >
            <Icon icon={item.icon} class="h-6 w-6" />
            <span class="sr-only">{item.name}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</main>

<style>
  .active {
    background-color: yellowgreen;
  }
</style>
