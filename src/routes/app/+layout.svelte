<script lang="ts">
  import type { LayoutProps } from "./$types";
  import { page } from "$app/state";
  import Header from "$lib/components/Header.svelte";
  import CalendarIcon from "$lib/components/icons/CalendarIcon.svelte";
  import FootstepsIcon from "$lib/components/icons/FootstepsIcon.svelte";
  import ChestIcon from "$lib/components/icons/ChestIcon.svelte";
  import DashboardIcon from "$lib/components/icons/DashboardIcon.svelte";
  import ShareIcon from "$lib/components/icons/ShareIcon.svelte";
  import { liveQuery } from "dexie";
  import { calendars } from "$lib/api";

  interface MenuItem {
    name: string;
    url: string;
    icon: typeof CalendarIcon;
  }

  let { data, children }: LayoutProps = $props();

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

  // Get active calendar to make sure we have received the calendar_created event
  let activeCalendar = liveQuery(() =>
    calendars.findById(data.activeCalendarId),
  );
</script>

<svelte:head>
  <title>
    {page.data.title ? `${page.data.title} | toolkitty` : "toolkitty"}
  </title>
</svelte:head>

{#if $activeCalendar?.name}
  <Header title={page.data.title} />
  <main class="px-3 mt-28 mb-20">
    {@render children()}
  </main>
  <nav
    class="fixed bottom-0 right-0 w-full py-2.5 px-6 border-t border-black bg-grey-very-light"
  >
    <ul class="flex gap-6 justify-between items-center h-full">
      {#each menu as { name, url, icon: Icon } (name)}
        <li>
          <a
            href={url}
            class={page.url.hash.includes(url) ? "active" : "not-active"}
          >
            <Icon />
            <span class="sr-only">{name}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{:else}
  <!-- Show pending state if active calendar is undefined -->
  <p>Waiting for calendar data from peers...</p>
{/if}
