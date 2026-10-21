<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings, calendars, spaces } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import Links from "$lib/components/Links.svelte";
  import { error } from "@sveltejs/kit";
  import ImageGallery from "$lib/components/ImageGallery.svelte";
  import SpaceLocation from "$lib/components/SpaceLocation.svelte";
  import Markdown from "$lib/components/Markdown.svelte";

  let { data }: PageProps = $props();
  let now = new Date();
  let upcomingBookings: Observable<BookingRequestEnriched[]> | undefined =
    $state();
  let amOwner = $state(false);

  let space = liveQuery(() => {
    const space = spaces.findById(data.spaceId);
    if (!space) {
      error(404, { message: "Space not found" });
    }
    return space;
  });

  let activeCalendar = liveQuery(() =>
    calendars.findById(data.activeCalendarId),
  );

  let calendarDates = $derived(
    $activeCalendar?.startDate
      ? {
          start: $activeCalendar.startDate,
          end: $activeCalendar.endDate,
        }
      : undefined,
  );

  $effect(() => {
    if ($space) {
      amOwner = $space.ownerId === data.publicKey;

      if (amOwner) {
        // TODO: Perhaps adjust to account for bookings taking place right now.
        upcomingBookings = liveQuery(() =>
          bookings.findAll({
            calendarId: data.activeCalendarId,
            resourceId: data.spaceId,
            from: now,
          }),
        );
      }
    }
  });
</script>

{#if $space}
  <div class="space-y-4">
    <h1 class="text-center text-[26px] normal-case">{$space.name}</h1>

    {#if amOwner}
      <UpcomingBookings {upcomingBookings} />
    {/if}

    <SpaceLocation location={$space.location} />

    <section
      class="rounded-sm bg-grey-very-light px-4 py-4 text-center text-[18px] leading-snug"
    >
      <Markdown content={$space.description} />
    </section>

    <section
      class="rounded-sm bg-grey-very-light px-4 py-4 text-center text-[17px] leading-snug"
    >
      <p class="m-0">
        <strong class="font-bold">Accessibility Information:</strong><br />
        {$space.accessibility}
      </p>
      <p class="m-0 mt-2">
        <strong class="font-bold">Capacity:</strong><br />
        {$space.capacity ?? "Not specified"}
      </p>
    </section>

    <ImageGallery images={$space.images} />

    {#if $space.link}
      <div class="mb-4">
        <Links links={[$space.link]} />
      </div>
    {/if}

    <AvailabilityViewer data={$space} type="space" {calendarDates} />

    {#if data.userRole === "admin" || amOwner}
      <a
        class="button-green button w-full"
        href="/app/spaces/edit?id={$space.id}"><span>edit</span></a
      >
    {/if}

    <pre>{JSON.stringify($space, null, 2)}</pre>
  </div>
{/if}
