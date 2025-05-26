<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings, resources } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import Links from "$lib/components/Links.svelte";
  import { error } from "@sveltejs/kit";
  import ImageGallery from "$lib/components/ImageGallery.svelte";

  let { data }: PageProps = $props();
  let now = new Date();
  // TODO: look into if this should be declared with `$state(...)` as errors says.
  // Should be fixed with $derived.by todo below.
  let upcomingBookings: Observable<BookingRequestEnriched[]>;
  let amOwner = $state(false);

  let resource = liveQuery(async () => {
    const resource = await resources.findById(data.resourceId);
    if (!resource) {
      error(404, {
        message: "Resource not found",
      });
    }
    return resource;
  });

  // TODO: use $derived.by instead of $effect here.
  $effect(() => {
    if ($resource) {
      amOwner = $resource.ownerId === data.publicKey;
      if (amOwner) {
        // TODO: Perhaps adjust to account for bookings taking place right now.
        upcomingBookings = liveQuery(() =>
          bookings.findAll({
            calendarId: data.activeCalendarId,
            resourceId: data.resourceId,
            from: now,
          }),
        );
      }
    }
  });
</script>

{#if $resource}
  <div class="space-y-4">
    <h1>{$resource.name}</h1>
    {#if amOwner}
      <UpcomingBookings {upcomingBookings} />
    {/if}
    <p>{$resource.description}</p>

    {#if $resource.link}
      <Links links={[$resource.link]} />
    {/if}

    {#if $resource.availability == "always"}
      <p>This resource is always available.</p>
    {:else}
      <AvailabilityViewer data={$resource} type="resource" />
    {/if}

    {#if data.userRole == "admin" || amOwner}
      <a
        class="button-green button w-full"
        href="/app/resources/edit?id={$resource.id}"><span>edit</span></a
      >
    {/if}

    <ImageGallery images={$resource.images} />

    <pre>{JSON.stringify($resource, null, 2)}</pre>
  </div>
{/if}
