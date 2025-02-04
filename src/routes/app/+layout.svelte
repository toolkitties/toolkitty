<script lang="ts">
  import "../../app.css";
  import Icon from "@iconify/svelte";
  import { page } from "$app/state";
  import Header from "../../components/header.svelte";

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
      name: "Admin",
      url: "/app/admin",
      icon: "lucide:share-2",
    },
  ];

  console.log(page.data.title);
</script>

<svelte:head>
  <title>
    {page.data.title} | toolkitty
  </title>
</svelte:head>

<Header title={page.data.title} />

<main class="h-dvh">
  <div class="p-8">
    <slot />
  </div>
  <nav class="fixed bottom-0 right-0 w-full p-2 px-4 border-t border-black">
    <ul class="flex justify-between items-center h-full">
      {#each menu as item}
        <li>
          <a
            href={item.url}
            class="block"
            class:active={page.url.pathname.includes(item.url)}
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
