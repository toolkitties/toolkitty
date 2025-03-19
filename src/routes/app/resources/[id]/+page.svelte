<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings, resources } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import Links from "$lib/components/Links.svelte";
  import { error } from "@sveltejs/kit";

  let { data }: PageProps = $props();

  let resource = liveQuery(async () => {
    const resource = await resources.findById(data.resourceId);
    if (!resource) {
      error(404, {
        message: "Resource not found",
      });
    }
    return resource;
  });

  let now = new Date();
  // TODO: look into if this should be declared with `$state(...)` as errors says.
  // Should be fixed with $derived.by todo below.
  let upcomingBookings: Observable<BookingRequestEnriched[]>;
  let amOwner = $state(false);

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

    <Links links={[$resource.link]} />

    <AvailabilityViewer data={$resource} />

    {#if data.userRole == "admin"}
      <a class="button" href="#/app/resources/{$resource.id}/edit">Edit</a>
    {/if}

    <pre>{JSON.stringify($resource, null, 2)}</pre>
  </div>
{/if}
