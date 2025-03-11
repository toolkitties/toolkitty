<script lang="ts">
  import "../../app.css";
  import { page } from "$app/state";
  import Header from "$lib/components/Header.svelte";
  import CalendarIcon from "$lib/components/icons/CalendarIcon.svelte";
  import FootstepsIcon from "$lib/components/icons/FootstepsIcon.svelte";
  import ChestIcon from "$lib/components/icons/ChestIcon.svelte";
  import DashboardIcon from "$lib/components/icons/DashboardIcon.svelte";
  import ShareIcon from "$lib/components/icons/ShareIcon.svelte";

  interface MenuItem {
    name: string;
    url: string;
    icon: typeof CalendarIcon;
  }

  const menu: MenuItem[] = [
    {
      name: "Calendar",
      url: "/app/events",
      icon: CalendarIcon,
    },
    {
      name: "Spaces",
      url: "/app/spaces",
      icon: FootstepsIcon,
    },
    {
      name: "Resources",
      url: "/app/resources",
      icon: ChestIcon,
    },
    {
      name: "Dashboard",
      url: "/app/dashboard",
      icon: DashboardIcon,
    },
    {
      name: "Admin",
      url: "/app/admin",
      icon: ShareIcon,
    },
  ];
</script>

<svelte:head>
  <title>
    {page.data.title ? `${page.data.title} | toolkitty` : "toolkitty"}
  </title>
</svelte:head>

<Header title={page.data.title} />

<main class="h-dvh">
  <div class="p-8">
    <slot />
  </div>
  <nav class="fixed bottom-0 right-0 w-full py-2.5 px-6 border-t border-black">
    <ul class="flex gap-6 justify-between items-center h-full">
      {#each menu as { name, url, icon: Icon } (name)}
        <li>
          <a
            href={url}
            class={page.url.pathname.includes(url) ? "active" : "not-active"}
          >
            <Icon />
            <span class="sr-only">{name}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</main>
