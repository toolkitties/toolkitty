<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import type { BookingRequestEnriched } from "$lib/types";
  import { bookings, resources } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import Links from "$lib/components/Links.svelte";

  import { error } from "@sveltejs/kit";
  import ImageGallery from "$lib/components/ImageGallery.svelte";

  let { data }: PageProps = $props();
  let now = new Date();

  let resource = liveQuery(async () => {
    const resource = await resources.findById(data.resourceId);
    if (!resource) {
      error(404, {
        message: "Resource not found",
      });
    }
    return resource;
  });

  let amOwner = $derived.by(() => {
    const isOwner = $resource?.ownerId === data.publicKey;
    return isOwner;
  });

  let upcomingBookings: Observable<BookingRequestEnriched[]> | undefined =
    $derived.by(() => {
      if ($resource && amOwner) {
        // TODO: Perhaps adjust to account for bookings taking place right now.
        return liveQuery(() =>
          bookings.findAll({
            calendarId: data.activeCalendarId,
            resourceId: data.resourceId,
            from: now,
          }),
        );
      }
      return undefined;
    });
</script>

{#if $resource}
  <div class="space-y-4">
    <h1 class="text-center">{$resource.name}</h1>
    {#if amOwner}
      <UpcomingBookings {upcomingBookings} />
    {/if}
    <div class="grey-lighter-box">
      <p>{$resource.description}</p>
    </div>

    <!-- TODO should be map and grey-lighter-box with location details -->

    <ImageGallery images={$resource.images} />

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

    <pre>{JSON.stringify($resource, null, 2)}</pre>
  </div>
{/if}
