<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings, spaces } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import Links from "$lib/components/Links.svelte";
  import { error } from "@sveltejs/kit";
  import ImageGallery from "$lib/components/ImageGallery.svelte";

  let { data }: PageProps = $props();
  let now = new Date();
  // TODO: look into if this should be declared with `$state(...)` as errors says.
  let upcomingBookings: Observable<BookingRequestEnriched[]>;
  let amOwner = $state(false);

  let space = liveQuery(() => {
    const space = spaces.findById(data.spaceId);
    if (!space) {
      error(404, {
        message: "Resource not found",
      });
    }
    return space;
  });

  $effect(() => {
    if ($space) {
      amOwner = $space.ownerId == data.publicKey;

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
    <h1>{$space.name}</h1>

    {#if amOwner}
      <UpcomingBookings {upcomingBookings} />
    {/if}

    <div>
      {#if $space.location.type === "physical"}
        <p>
          {#if $space.location.street}{$space.location.street}{/if}
          {#if $space.location.city}, {$space.location.city}{/if}
          {#if $space.location.state}, {$space.location.state}{/if}
          {#if $space.location.zip}, {$space.location.zip}{/if}
          {#if $space.location.country}, {$space.location.country}{/if}
        </p>
      {:else if $space.location.type === "gps"}
        <p>{$space.location.lat}, {$space.location.lon}</p>
      {:else}
        <p>{$space.location.link}</p>
      {/if}
    </div>

    {#if $space.link}
      <Links links={[$space.link]} />
    {/if}

    <p>{$space.description}</p>

    <div>
      <p>Accessibility Information: {$space.accessibility}</p>
      <p>Capacity: {$space.capacity}</p>
    </div>

    {#if $space.availability == "always"}
      <p>This space is always available.</p>
    {:else}
      <AvailabilityViewer data={$space} type="space" />
    {/if}

    <ImageGallery images={$space.images} />

    {#if data.userRole == "admin" || amOwner}
      <a
        class="button-green button w-full"
        href="/app/spaces/edit?id={$space.id}"><span>edit</span></a
      >
    {/if}

    <pre>{JSON.stringify($space, null, 2)}</pre>
  </div>
{/if}
