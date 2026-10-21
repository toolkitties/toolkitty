<script lang="ts">
  import AvailabilityViewer from "$lib/components/AvailabilityViewer.svelte";
  import ImageUploader from "$lib/components/ImageUploader.svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { toast } from "$lib/toast.svelte";
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { EventSchema } from "$lib/schemas";
  import { superForm, setError } from "sveltekit-superforms";
  import { eventSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { events, resources, bookings, spaces as spacesApi } from "$lib/api";
  import { TimeSpanClass } from "$lib/timeSpan";
  import ActionFormButtons from "$lib/components/ActionFormButtons.svelte";
  import TicketIcon from "$lib/components/icons/TicketIcon.svelte";
  import { Accordion } from "bits-ui";
  import ChevronIcon from "$lib/components/icons/ChevronIcon.svelte";
  import {
    availabilityTimeSlots,
    slotDateTime,
  } from "$lib/utils/availabilitySlots";
  let {
    data,
    activeCalendarId,
    currentSpace,
    spaces,
    resourcesList,
    userRole,
  }: {
    data: SuperValidated<Infer<EventSchema>>;
    activeCalendarId: Hash;
    currentSpace?: Space;
    spaces: Space[];
    resourcesList: Resource[];
    userRole: string;
  } = $props();

  let selectedSpace = $state<Space | undefined>(currentSpace);
  let selectedSpaceId = $state<string | undefined>(currentSpace?.id);
  let selectedAvailabilityDate = $state(
    data.data.startDate?.split("T")[0] ?? "",
  );
  let availableResources: Resource[] = $state(resourcesList);
  let selectedResources: Resource[] = $state([]);
  let availableResourceBookings: { resourceId: string; timeSpan: TimeSpan }[] =
    $state([]);
  let isSubmitting = $state(false);
  let publishStatusUnknown = $state(false);

  let availableTimes = $state(
    availabilityTimeSlots.map((slot) => ({
      ...slot,
      available: false,
      selected: false,
    })),
  );

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
    if (selectedSpaceId !== space.id) {
      availableTimes = availableTimes.map((slot) => ({
        ...slot,
        available: false,
        selected: false,
      }));
      $form.startDate = "";
      $form.endDate = "";
      $form.publicStartDate = "";
      $form.publicEndDate = "";
    }

    selectedSpace = space;
    selectedSpaceId = space.id;
    selectedAvailabilityDate = Array.isArray(space.availability)
      ? (space.availability[0]?.start.split("T")[0] ?? "")
      : new Date().toISOString().split("T")[0];
    if (selectedAvailabilityDate) {
      void refreshAvailableTimes(space, selectedAvailabilityDate).catch(
        (error) => console.error("Could not load available times:", error),
      );
    }
    availableResourceBookings = [];
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

  async function refreshAvailableTimes(space: Space, date: string) {
    const bookingsForDay = space.multiBookable
      ? []
      : await spacesApi.findBookings(
          space.id,
          new TimeSpanClass({
            start: `${date}T00:00`,
            end: slotDateTime(date, "24:00"),
          }),
        );

    if (selectedSpaceId !== space.id || selectedAvailabilityDate !== date) {
      return;
    }

    availableTimes = availabilityTimeSlots.map((slot) => {
      const slotStart = new Date(`${date}T${slot.start}`).getTime();
      const slotEnd = new Date(slotDateTime(date, slot.end)).getTime();
      const availableFromSchedule =
        space.availability === "always" ||
        space.availability.some((entry) => {
          const availableStart = new Date(entry.start).getTime();
          const availableEnd = new Date(entry.end).getTime();
          return availableStart <= slotStart && availableEnd >= slotEnd;
        });
      const booked = bookingsForDay.some((booking) => {
        const bookingStart = new Date(booking.timeSpan.start).getTime();
        const bookingEnd = new Date(booking.timeSpan.end).getTime();
        return bookingStart < slotEnd && bookingEnd > slotStart;
      });

      return {
        ...slot,
        available: availableFromSchedule && !booked,
        selected: false,
      };
    });
  }

  function handleAvailableDateChange(date: string) {
    if (selectedAvailabilityDate === date) return;
    selectedAvailabilityDate = date;
    availableTimes = availableTimes.map((slot) => ({
      ...slot,
      available: false,
      selected: false,
    }));
    $form.startDate = "";
    $form.endDate = "";
    $form.publicStartDate = "";
    $form.publicEndDate = "";
    if (selectedSpace) {
      void refreshAvailableTimes(selectedSpace, date).catch((error) =>
        console.error("Could not load available times:", error),
      );
    }
  }

  onMount(() => {
    if (selectedSpace && selectedAvailabilityDate) {
      void refreshAvailableTimes(selectedSpace, selectedAvailabilityDate).catch(
        (error) => console.error("Could not load available times:", error),
      );
    }
  });

  function isResourceSelected(resourceId: string) {
    return selectedResources.some((resource) => resource.id === resourceId);
  }

  function toggleResource(resource: Resource) {
    selectedResources = isResourceSelected(resource.id)
      ? selectedResources.filter((item) => item.id !== resource.id)
      : [...selectedResources, resource];
  }

  function toggleAvailableTime(index: number) {
    if (!selectedAvailabilityDate || !availableTimes[index].available) return;

    availableTimes = availableTimes.map((slot, slotIndex) =>
      slotIndex === index ? { ...slot, selected: !slot.selected } : slot,
    );

    const selectedSlots = availableTimes.filter((slot) => slot.selected);
    if (selectedSlots.length === 0) {
      $form.startDate = "";
      $form.endDate = "";
      return;
    }

    $form.startDate = `${selectedAvailabilityDate}T${selectedSlots[0].start}`;
    $form.endDate = `${selectedAvailabilityDate}T${selectedSlots.at(-1)!.end}`;

    if (!$form.publicStartDate) $form.publicStartDate = $form.startDate;
    if (!$form.publicEndDate) $form.publicEndDate = $form.endDate;
    recalculateResourceAvailability();
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
      if (!form.data.startDate || !form.data.endDate) {
        setError(form, "startDate", "Please select available times first.");
        return;
      }
      if (
        !form.data.publicStartDate ||
        !form.data.publicEndDate ||
        form.data.publicStartDate < form.data.startDate ||
        form.data.publicEndDate > form.data.endDate ||
        form.data.publicStartDate >= form.data.publicEndDate
      ) {
        setError(
          form,
          "publicStartDate",
          "Event time must be within the selected booking times.",
        );
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
        if (isSubmitting || publishStatusUnknown) return;
        isSubmitting = true;
        const { id, ...payload } = form.data;

        // Filter out links with empty URLs
        payload.links = payload.links?.filter((link) => link.url !== "");

        try {
          if (form.data.id) {
            await handleUpdateEvent(id!, payload);
          } else {
            await handleCreateEvent(payload);
          }
        } finally {
          isSubmitting = false;
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

  // The processor may defer an operation until dependencies arrive. Don't keep
  // the UI spinning forever or permit a retry that could create a duplicate.
  async function waitForPublish<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            publishStatusUnknown = true;
            reject(
              new Error(
                "Publishing timed out. Check your events before trying again.",
              ),
            );
          }, 30000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function handleCreateEvent(payload: EventFields) {
    try {
      const eventId = await waitForPublish(
        events.create(activeCalendarId, payload),
      );
      const timeSpan = { start: payload.startDate, end: payload.endDate };

      // Process dependent requests in order, after the event exists locally.
      if (selectedSpace) {
        await waitForPublish(
          bookings.request(
            eventId,
            selectedSpace.id,
            "space",
            "Requesting access to space",
            timeSpan,
          ),
        );
      }
      for (const resource of selectedResources) {
        await waitForPublish(
          bookings.request(
            eventId,
            resource.id,
            "resource",
            "Requesting resource",
            timeSpan,
          ),
        );
      }

      toast.success("Event created!");
      await goto(`/app/events/view?id=${eventId}`);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error(
        publishStatusUnknown
          ? "Publishing is taking too long. Check your events before trying again."
          : "Error creating event! Check your events before retrying.",
      );
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
  <a href="/app/spaces/create" class="button button-green mt-4 mx-auto w-fit"
    >Create space</a
  >
{:else}
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
      placeholder="You can use Markdown to format your text. Make sure you give enough information about the event."
      bind:value={$form.description}
    ></textarea>
    {#if $errors.description}<span class="form-error"
        >{$errors.description}</span
      >{/if}

    {#if $form.links}
      {#if $form.links[0]}
        <fieldset class="mt-1">
          <legend class="mb-2 text-[20px]">
            <span class="relative top-[4px] inline-block"
              ><TicketIcon size={22} /></span
            >
            Ticket Link
          </legend>
          <div class="flex flex-row gap-2">
            <div class="min-w-0 flex-1">
              <label for="ticket-link-text">Link Title</label>
              <input
                id="ticket-link-text"
                type="text"
                name="ticket-link-text"
                placeholder="Link title"
                aria-invalid={$errors.links?.[0].title ? "true" : undefined}
                bind:value={$form.links[0].title}
              />
              {#if $errors.links?.[0].title}<span class="form-error"
                  >{$errors.links?.[0].title}</span
                >{/if}
            </div>
            <div class="min-w-0 flex-1">
              <label for="ticket-link-url">URL</label>
              <input
                id="ticket-link-url"
                type="url"
                name="ticket-link-url"
                placeholder="http://www.example.com"
                aria-invalid={$errors.links?.[0].url ? "true" : undefined}
                bind:value={$form.links[0].url}
              />
              {#if $errors.links?.[0].url}<span class="form-error"
                  >{$errors.links?.[0].url}</span
                >{/if}
            </div>
          </div>
        </fieldset>
      {/if}

      {#if $form.links[1]}
        <fieldset class="mt-4">
          <legend class="mb-2 text-[20px]"
            >🔗 Other link (website, social media)</legend
          >
          <div class="flex flex-row gap-2">
            <div class="min-w-0 flex-1">
              <label for="additional-link-text">Link Title</label>
              <input
                id="additional-link-text"
                type="text"
                name="additional-link-text"
                placeholder="Link title"
                aria-invalid={$errors.links?.[1].title ? "true" : undefined}
                bind:value={$form.links[1].title}
              />
              {#if $errors.links?.[1].title}<span class="form-error"
                  >{$errors.links?.[1].title}</span
                >{/if}
            </div>
            <div class="min-w-0 flex-1">
              <label for="additional-link-url">URL</label>
              <input
                id="additional-link-url"
                type="url"
                name="additional-link-url"
                placeholder="http://www.example.com"
                aria-invalid={$errors.links?.[1].url ? "true" : undefined}
                bind:value={$form.links[1].url}
              />
              {#if $errors.links?.[1].url}<span class="form-error"
                  >{$errors.links?.[1].url}</span
                >{/if}
            </div>
          </div>
        </fieldset>
      {/if}
    {/if}

    <section class="mt-4 overflow-hidden rounded-sm border border-black">
      <h2 class="bg-grey-medium px-2 py-2 text-[20px] normal-case">
        Select a space*
      </h2>
      <ul>
        {#each spaces as space (space.id)}
          <li
            class={space.location?.type === "virtual"
              ? "bg-blue-light"
              : space.location?.type === "physical"
                ? "bg-light-yellow"
                : space.location?.type === "gps"
                  ? "bg-pink-light"
                  : ""}
          >
            <button
              type="button"
              onclick={() => handleSpaceSelection(space)}
              class={`flex w-full items-center justify-between rounded-none border-0 bg-transparent px-2 py-2 text-left text-[16px] ${selectedSpaceId === space.id ? "font-bold" : ""}`}
              aria-pressed={selectedSpaceId === space.id}
            >
              <span>{space.name}</span>
              {#if selectedSpaceId === space.id}
                <span aria-hidden="true">✓</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    </section>

    <div class="mt-4 space-y-0">
      {#if selectedSpace}
        {#key selectedSpace.id}
          <AvailabilityViewer
            data={selectedSpace}
            selected={selectedAvailabilityDate
              ? `${selectedAvailabilityDate}T12:00:00Z`
              : undefined}
            type="space"
            title="Select from available date*"
            showSlots={false}
            onDateChange={handleAvailableDateChange}
          />
        {/key}
      {:else}
        <section class="overflow-hidden rounded-sm border border-black">
          <h2
            class="bg-grey-medium px-3 py-2 text-center text-[20px] normal-case"
          >
            Select from available date*
          </h2>
          <p class="m-0 border-t border-black p-3 text-center">
            Select a space first.
          </p>
        </section>
      {/if}

      <div>
        <section class="overflow-hidden rounded-sm border border-black">
          <h2
            class="border-b border-black bg-grey-medium px-2 py-2 text-[20px] normal-case"
          >
            Select from available times (including set-up)*
          </h2>
          <div class="flex flex-col">
            {#each availableTimes as timeSlot, i (i)}
              <button
                type="button"
                disabled={!timeSlot.available}
                aria-pressed={timeSlot.selected}
                onclick={() => toggleAvailableTime(i)}
                class={`w-full justify-center rounded-none border-0 border-b border-grey-medium-light px-2 py-2 text-center text-[16px] ${
                  !timeSlot.available
                    ? "cursor-not-allowed bg-white text-grey-medium-light"
                    : timeSlot.selected
                      ? "bg-green-light-fluro text-black"
                      : "bg-white hover:bg-green-light-fluro"
                }`}
              >
                {timeSlot.start} - {timeSlot.end}
              </button>
            {/each}
          </div>
          {#if $errors.startDate}<span class="form-error px-2"
              >{$errors.startDate}</span
            >{/if}
          {#if $errors.endDate}<span class="form-error px-2"
              >{$errors.endDate}</span
            >{/if}
        </section>

        <Accordion.Root type="single" value="resources" class="w-full">
          <Accordion.Item value="resources">
            <Accordion.Trigger
              class="bg-grey-medium rounded-t rounded-b-none w-full"
            >
              <label
                for="aboutText"
                class="bg-grey-medium w-full flex justify-between cursor-pointer pb-0.75"
                >Select resources
              </label>
              <span
                class="transition-transform duration-200 data-[state=open]:rotate-180"
              >
                <ChevronIcon size={16} />
              </span>
            </Accordion.Trigger>

            <Accordion.Content class="border border-black border-t-0 rounded">
              <!-- {#if availableResources.length > 0}
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
            {/if} -->

              {#if availableResources.length > 0}
                <div class="flex flex-col">
                  {#each availableResources as resource (resource.id)}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isResourceSelected(resource.id)}
                      onclick={() => toggleResource(resource)}
                      class={`flex w-full items-center justify-between gap-3 rounded-none border-0 bg-transparent px-3 py-2 text-left text-[16px] ${isResourceSelected(resource.id) ? "font-bold" : ""}`}
                    >
                      <span>{resource.name}</span>
                      <span
                        class={`size-4 shrink-0 rounded-full border-2 border-black ${isResourceSelected(resource.id) ? "bg-red-light" : "bg-white"}`}
                        aria-hidden="true"
                      ></span>
                    </button>
                  {/each}
                </div>
              {:else}
                <p class="m-0 p-2">No available resources.</p>
              {/if}
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>
      <section class="overflow-hidden rounded-sm border border-black">
        <h2
          class="border-b border-black bg-grey-medium px-2 py-2 text-center text-[20px] normal-case"
        >
          Event time (excluding set-up)*
        </h2>
        <div class="divide-y divide-black">
          <div class="flex items-center justify-between gap-3 px-2 py-2">
            <label for="publicStartDate" class="shrink-0 text-[16px]"
              >Event start</label
            >
            <input
              id="publicStartDate"
              class="mb-0 w-auto min-w-0 py-1 not-italic"
              type="datetime-local"
              name="publicStartDate"
              min={$form.startDate || undefined}
              max={$form.endDate || undefined}
              bind:value={$form.publicStartDate}
              aria-invalid={$errors.publicStartDate ? "true" : undefined}
            />
          </div>
          {#if $errors.publicStartDate}<span class="form-error px-2"
              >{$errors.publicStartDate}</span
            >{/if}
          <div class="flex items-center justify-between gap-3 px-2 py-2">
            <label for="publicEndDate" class="shrink-0 text-[16px]"
              >Event end</label
            >
            <input
              id="publicEndDate"
              class="mb-0 w-auto min-w-0 py-1 not-italic"
              type="datetime-local"
              name="publicEndDate"
              min={$form.publicStartDate || $form.startDate || undefined}
              max={$form.endDate || undefined}
              bind:value={$form.publicEndDate}
              aria-invalid={$errors.publicEndDate ? "true" : undefined}
            />
          </div>
          {#if $errors.publicEndDate}<span class="form-error px-2"
              >{$errors.publicEndDate}</span
            >{/if}
        </div>
      </section>
    </div>

    <p>Images</p>
    <ImageUploader bind:images={$form.images as string[]} />

    <br />
    <!-- {#if $errors.selectedSpace}<span class="form-error"
        >{$errors.selectedSpace}</span
      >{/if} -->

    {#if publishStatusUnknown}
      <p role="alert" class="form-error">
        Publishing is taking too long. Check your events before trying again to
        avoid creating a duplicate.
      </p>
    {/if}
    <ActionFormButtons
      id={$form.id!}
      name={$form.name}
      {userRole}
      onSaveDraft={() => {}}
      disabled={isSubmitting || publishStatusUnknown}
    />
  </form>
{/if}
