<script lang="ts">
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import ImageUploader from "$lib/components/ImageUploader.svelte";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { EventSchema } from "$lib/schemas";
  import { superForm, setError } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";
  import { eventSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { events, resources, bookings } from "$lib/api";
  import { TimeSpanClass } from "$lib/timeSpan";
  import DatePicker from "$lib/components/inputs/DatePicker.svelte";

  let {
    data,
    activeCalendarId,
    currentSpace,
    spaces,
    resourcesList,
  }: {
    data: SuperValidated<Infer<EventSchema>>;
    activeCalendarId: Hash;
    currentSpace?: Space;
    spaces: Space[];
    resourcesList: Resource[];
  } = $props();

  let selectedSpace = $state<Space | undefined>(currentSpace);
  let selectedSpaceId = $state<string | undefined>(currentSpace?.id);
  let availableResources: Resource[] = $state(resourcesList);
  let selectedResources: Resource[] = $state([]);
  let availableResourceBookings: { resourceId: string; timeSpan: TimeSpan }[] =
    $state([]);

  // resource filtering if update form
  // if (currentSpace && currentSpace.availability !== "always") {
  //   async () => {
  //     // filter resources by the start and end date of the event being updated
  //     const spaceTimeSpan = {
  //       start: data.data.startDate,
  //       end: data.data.endDate,
  //     };
  //     availableResources = await resources.findByTimeSpan(
  //       activeCalendarId,
  //       new TimeSpanClass(spaceTimeSpan),
  //     );
  //   };

  //   if (data.data.resourceRequests) {
  //     // have these resources be checked
  //     console.log(data.data.resourceRequests);
  //   }
  // }

  async function handleSpaceSelection(space: Space) {
    selectedSpace = space;
    if (selectedSpace.availability == "always") {
      availableResources = resourcesList;
    } else {
      // create a timeSpan from all availability entries on that space and filter resources on that
      let spaceTimeSpan = calculateSpaceTimespan(selectedSpace.availability);
      availableResources = await resources.findByTimeSpan(
        activeCalendarId,
        new TimeSpanClass(spaceTimeSpan),
      );
      for (const resource of availableResources) {
        const bookings = await resources.findBookings(
          resource.id,
          new TimeSpanClass(spaceTimeSpan),
        );
        if (bookings.length > 0) {
          for (const booking of bookings) {
            availableResourceBookings.push({
              resourceId: resource.id,
              timeSpan: {
                start: booking.timeSpan.start,
                end: booking.timeSpan.end,
              },
            });
          }
          // filter resources again if there are any bookings at the selected time
          recalculateResourceAvailability();
        }
      }
    }
  }

  function calculateSpaceTimespan(availability: TimeSpan[]): TimeSpan {
    return {
      start: availability.reduce((acc, curr) =>
        acc.start < curr.start ? acc : curr,
      ).start,
      end: availability.reduce((acc, curr) =>
        acc.end! > curr.end! ? acc : curr,
      ).end,
    };
  }

  function recalculateResourceAvailability() {
    if (availableResourceBookings.length === 0) return;
    const eventTimeSpan = {
      start: $form.startDate,
      end: $form.endDate,
    };
    /*
    Go through each selectedResourceBooking
    if the timeSpan overlaps with the selectedResourceBooking
    then remove the resource from availableResources
    */
    for (const booking of availableResourceBookings) {
      if (
        eventTimeSpan.start < booking.timeSpan.end! &&
        eventTimeSpan.end > booking.timeSpan.start
      ) {
        availableResources = availableResources.filter(
          (resource) => resource.id !== booking.resourceId,
        );
      }
    }
  }

  const { form, errors, enhance } = superForm(data, {
    SPA: true,
    validators: zod(eventSchema),
    resetForm: false,
    dataType: "json",
    async onUpdate({ form }) {
      // Additional checks for selectedSpace
      if (!selectedSpace) {
        setError(form, "startDate", "Please select a space first.");
        return;
      }

      // Validation of dates against space availability
      // If availability is "always", skip validation
      if (selectedSpace.availability !== "always") {
        let spaceTimeSpan = calculateSpaceTimespan(
          selectedSpace.availability as TimeSpan[],
        );

        const startDate = new Date(form.data.startDate);
        const endDate = new Date(form.data.endDate);
        const publicStartDate = new Date(form.data.publicStartDate);
        const publicEndDate = new Date(form.data.publicEndDate);
        const earliestStart = new Date(spaceTimeSpan.start);
        const latestEnd = new Date(spaceTimeSpan.end!);

        if (startDate < earliestStart) {
          setError(
            form,
            "startDate",
            "Start date cannot be before the space's earliest availability.",
          );
          return;
        }
        if (startDate > latestEnd) {
          setError(
            form,
            "startDate",
            "Start date cannot be after the space's latest availability.",
          );
          return;
        }
        if (endDate > latestEnd) {
          setError(
            form,
            "endDate",
            "End date cannot be after the space's latest availability.",
          );
          return;
        }

        if (publicStartDate < earliestStart) {
          setError(
            form,
            "publicStartDate",
            "Public start date cannot be before the space's earliest availability.",
          );
          return;
        }
        if (publicStartDate > latestEnd) {
          setError(
            form,
            "publicStartDate",
            "Public start date cannot be after the space's latest availability.",
          );
          return;
        }
        if (publicEndDate > latestEnd) {
          setError(
            form,
            "publicEndDate",
            "Public end date cannot be after the space's latest availability.",
          );
          return;
        }
      }

      // TODO: potentially move above validation to schema
      if (form.valid) {
        const { id, ...payload } = form.data;

        // Filter out links with empty URLs
        payload.links = payload.links?.filter((link) => link.url !== "");

        if (form.data.id) {
          console.log("update event");
          handleUpdateEvent(id!, payload);
        } else {
          console.log("create space");
          handleCreateEvent(payload);
        }
      }
    },
  });

  // Remove date proxies as temp fix for date.
  // TODO(@jack): refactor to use bits ui date picker
  // let startDateProxy = $state(
  //   dateProxy(form, "startDate", { format: "datetime-utc" }),
  // );
  // let endDateProxy = $state(
  //   dateProxy(form, "endDate", { format: "datetime-utc" }),
  // );
  // let publicStartDateProxy = $state(
  //   dateProxy(form, "publicStartDate", { format: "datetime-utc" }),
  // );
  // let publicEndDateProxy = $state(
  //   dateProxy(form, "publicEndDate", { format: "datetime-utc" }),
  // );

  async function handleCreateEvent(payload: EventFields) {
    try {
      const eventId = await events.create(activeCalendarId, payload);

      let spaceBookingId: string | undefined = undefined;
      let resourceBookingIds: string[] = [];

      // Request selected space booking
      if (selectedSpace) {
        const spaceBooking = await bookings.request(
          eventId,
          selectedSpace.id,
          "space",
          "Requesting access to space",
          {
            start: payload.startDate,
            end: payload.endDate,
          },
        );
        spaceBookingId = spaceBooking; // store to update event with booking id
      }

      // Request selected resources booking
      if (selectedResources.length > 0) {
        for (const resource of selectedResources) {
          const resourceBooking = await bookings.request(
            eventId,
            resource.id,
            "resource",
            "Requesting resource",
            {
              start: payload.startDate,
              end: payload.endDate,
            },
          );
          resourceBookingIds.push(resourceBooking);
        }
      }

      // after booking request are sent, update event with booking ids
      await events.update(eventId, {
        ...payload,
        spaceRequest: spaceBookingId,
        resourcesRequests: resourceBookingIds ? resourceBookingIds : undefined,
      });

      toast.success("Event created!");
      goto(`/app/events/view?id=${eventId}`);
    } catch (error) {
      console.error("Error creating event: ", error);
      toast.error("Error creating event!");
    }
  }

  async function handleUpdateEvent(eventId: Hash, payload: EventFields) {
    try {
      await events.update(eventId, payload);

      toast.success("Event updated!");
      goto(`/app/events/view?id=${eventId}`);
    } catch (error) {
      console.error("Error updating event: ", error);
      toast.error("Error updating event!");
    }
  }
</script>

{#if spaces.length == 0}
  <p>
    No available spaces have been contributed. Create at least one space before
    creating an event.
  </p>
  <a href="/app/spaces/create" class="button mt-4 inline-block">Create space</a>
{:else}
  <SuperDebug data={{ $form, $errors }} />
  <form method="POST" use:enhance>
    <label for="name">Event name*</label>
    <input
      type="text"
      name="name"
      aria-invalid={$errors.name ? "true" : undefined}
      bind:value={$form.name}
    />
    {#if $errors.name}<span class="form-error">{$errors.name}</span>{/if}

    <label for="description">Event description*</label>
    <textarea
      name="description"
      aria-invalid={$errors.description ? "true" : undefined}
      bind:value={$form.description}
    ></textarea>
    {#if $errors.description}<span class="form-error"
        >{$errors.description}</span
      >{/if}

    {#if $form.links}
      {#if $form.links[0]}
        <p>🎫 Ticket Link</p>
        <div class="flex flex-row">
          <div>
            <label for="ticket-link-text">Link text</label>
            <input
              type="text"
              name="ticket-link-text"
              aria-invalid={$errors.links?.[0].title ? "true" : undefined}
              bind:value={$form.links[0].title}
            />
            {#if $errors.links?.[0].title}<span class="form-error"
                >{$errors.links?.[0].title}</span
              >{/if}
          </div>
          <div>
            <label for="ticket-link-url">URL</label>
            <input
              type="url"
              name="ticket-link-url"
              aria-invalid={$errors.links?.[0].url ? "true" : undefined}
              bind:value={$form.links[0].url}
            />
            {#if $errors.links?.[0].url}<span class="form-error"
                >{$errors.links?.[0].url}</span
              >{/if}
          </div>
        </div>
      {/if}

      {#if $form.links[1]}
        <p>🔗 Additional Link</p>
        <div class="flex flex-row">
          <div>
            <label for="additional-link-text">Link text</label>
            <input
              type="text"
              name="additional-link-text"
              aria-invalid={$errors.links?.[1].title ? "true" : undefined}
              bind:value={$form.links[1].title}
            />
            {#if $errors.links?.[1].title}<span class="form-error"
                >{$errors.links?.[1].title}</span
              >{/if}
          </div>
          <div>
            <label for="additional-link-url">URL</label>
            <input
              type="url"
              name="additional-link-url"
              aria-invalid={$errors.links?.[1].url ? "true" : undefined}
              bind:value={$form.links[1].url}
            />
            {#if $errors.links?.[1].url}<span class="form-error"
                >{$errors.links?.[1].url}</span
              >{/if}
          </div>
        </div>
      {/if}
    {/if}

    <p>Select a space:</p>
    <ul>
      {#each spaces as space (space.id)}
        <li>
          <input
            type="radio"
            id={space.id}
            name="selected-space"
            onchange={() => handleSpaceSelection(space)}
            value={space.id}
            bind:group={selectedSpaceId}
          />
          <label for={space.id}>{space.name}</label>
        </li>
      {/each}
    </ul>
    {#if selectedSpace}
      <div class="space-availability">
        <p>View availability for {selectedSpace.name}</p>
        {#if selectedSpace.availability === "always"}
          <p>This space is always available :D</p>
        {:else}
          <AvailabilityViewer
            data={selectedSpace}
            selected={$form.startDate}
            type="space"
          />
        {/if}
      </div>

      <p>Request access to selected space</p>
      <div class="flex flex-row">
        <!-- <input
          type="datetime-local"
          name="startDate"
          required
          aria-invalid={$errors.startDate ? "true" : undefined}
          bind:value={$form.startDate}
          onchange={recalculateResourceAvailability}
        /> -->
        <DatePicker bind:value={$form.startDate} label="access start *" />
        {#if $errors.startDate}<span class="form-error"
            >{$errors.startDate}</span
          >{/if}
        <!-- <input
          type="datetime-local"
          name="endDate"
          required
          aria-invalid={$errors.endDate ? "true" : undefined}
          bind:value={$form.endDate}
          onchange={recalculateResourceAvailability}
        /> -->
        <DatePicker bind:value={$form.endDate} label="access end *" />

        {#if $errors.endDate}<span class="form-error">{$errors.endDate}</span
          >{/if}
      </div>

      <p>Set public event start and end</p>
      <div class="flex flex-row">
        <label for="publicStartDate">Start *</label>
        <input
          type="datetime-local"
          name="startDate"
          aria-invalid={$errors.publicStartDate ? "true" : undefined}
          bind:value={$form.publicStartDate}
        />
        {#if $errors.publicStartDate}<span class="form-error"
            >{$form.publicStartDate}</span
          >{/if}

        <label for="publicEndDate">End *</label>
        <input
          type="datetime-local"
          name="publicEndDate"
          aria-invalid={$errors.publicEndDate ? "true" : undefined}
          bind:value={$form.publicEndDate}
        />
        {#if $errors.publicEndDate}<span class="form-error"
            >{$errors.publicEndDate}</span
          >{/if}
      </div>

      {#if availableResources.length > 0}
        <label for="resource-list">Select from available resources</label>
        <ul id="resource-list">
          {#each availableResources as resource (resource.id)}
            <li>
              <input
                type="checkbox"
                id="resource-{resource.id}"
                value={resource}
                bind:group={selectedResources}
              />
              <label for="resource-{resource.id}">{resource.name}</label>
            </li>
          {/each}
        </ul>
      {:else}
        <p>No available resources.</p>
      {/if}
    {/if}

    <p>Images</p>
    <ImageUploader bind:images={$form.images as string[]} />

    <br />

    <!-- {#if $errors.selectedSpace}<span class="form-error"
        >{$errors.selectedSpace}</span
      >{/if} -->

    <button type="submit">{$form.id ? "Update" : "Create"}</button>
  </form>
{/if}
