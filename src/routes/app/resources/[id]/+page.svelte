<script lang="ts">
  import type { PageProps } from "./$types";
  import { liveQuery } from "dexie";
  import type { Observable } from "dexie";
  import { bookings } from "$lib/api";
  import UpcomingBookings from "$lib/components/UpcomingBookings.svelte";

  let { data }: PageProps = $props();

  let now = new Date();
  // TODO: look into if this should be declared with `$state(...)` as errors says.
  let upcomingBookings: Observable<BookingRequestEnriched[]>;
  let amOwner = data.resource.ownerId === data.publicKey;

  if (amOwner) {
    // TODO: Perhaps adjust to account for bookings taking place right now.
    upcomingBookings = liveQuery(() =>
      bookings.findAll({
        calendarId: data.activeCalendarId,
        resourceId: data.resource.id,
        from: now,
      }),
    );
  }
</script>

<h1>{data.resource.name}</h1>
{#if amOwner}
  <UpcomingBookings {upcomingBookings} />
{/if}
<p>{data.resource.description}</p>

{#if data.userRole == "admin"}
  <a class="button" href="/app/resources/{data.resource!.id}/edit">Edit</a>
{/if}

<pre>{JSON.stringify(data.resource)}</pre>
