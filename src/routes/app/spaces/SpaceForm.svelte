<script lang="ts">
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { SpaceSchema } from "$lib/schemas";
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import ImageUploader from "$lib/components/ImageUploader.svelte";
  import { spaces } from "$lib/api";
  import { goto } from "$app/navigation";
  import { toast } from "$lib/toast.svelte";
  import { spaceSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { superForm } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";
  import ActionFormButtons from "$lib/components/ActionFormButtons.svelte";
  import BubbleIcon from "$lib/components/icons/BubbleIcon.svelte";
  import type { DateValue } from "@internationalized/date";
  import {
    availabilityTimeSlots,
    initialAvailabilityDate,
    slotDateTime,
  } from "$lib/utils/availabilitySlots";
  import { hasFormErrors, scrollToFirstFormError } from "$lib/utils/formErrors";

  let {
    data,
    activeCalendarId,
    calendarDates,
    userRole,
  }: {
    data: SuperValidated<Infer<SpaceSchema>>;
    activeCalendarId: Hash;
    calendarDates: TimeSpan;
    userRole: string;
  } = $props();

  // Preserve existing globally available spaces until their schedule is changed.
  let legacyAlways = $state(data.data.availability === "always");
  let selectedAvailabilityDate: DateValue | undefined = $state(
    initialAvailabilityDate(calendarDates.start, calendarDates.end),
  );
  let availabilitySlots: TimeSpan[] = $state(
    Array.isArray(data.data.availability) ? data.data.availability : [],
  );

  // Keep a separate in-memory draft for every location tab. Only the currently
  // selected draft is submitted
  let physicalLocationDraft = $state(
    data.data.location.type === "physical"
      ? { ...data.data.location }
      : {
          type: "physical" as const,
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
  );
  let gpsLocationDraft = $state(
    data.data.location.type === "gps"
      ? { ...data.data.location }
      : { type: "gps" as const, lat: 0, lon: 0 },
  );
  let virtualLocationDraft = $state(
    data.data.location.type === "virtual"
      ? { ...data.data.location }
      : { type: "virtual" as const, link: "" },
  );
  let selectedDay = $derived(
    selectedAvailabilityDate?.toString().split("T")[0],
  );
  let alwaysAvailable = $derived(
    !!selectedDay &&
      (legacyAlways ||
        availabilityTimeSlots.every((slot) =>
          availabilitySlots.some(
            (entry) =>
              entry.start === `${selectedDay}T${slot.start}` &&
              entry.end === slotDateTime(selectedDay!, slot.end),
          ),
        )),
  );

  function toggleDayAvailability() {
    if (!selectedDay) return;
    const clearDay = alwaysAvailable;
    legacyAlways = false;
    const otherDays = availabilitySlots.filter(
      (entry) => entry.start.split("T")[0] !== selectedDay,
    );
    availabilitySlots = clearDay
      ? otherDays
      : [
          ...otherDays,
          ...availabilityTimeSlots.map((slot) => ({
            start: `${selectedDay}T${slot.start}`,
            end: slotDateTime(selectedDay!, slot.end),
          })),
        ].sort((a, b) => a.start.localeCompare(b.start));
  }

  const { form, errors, enhance } = superForm(data, {
    SPA: true,
    validators: zod(spaceSchema),
    resetForm: false,
    dataType: "json",
    onSubmit() {
      form.update((current) => ({
        ...current,
        availability: legacyAlways
          ? "always"
          : availabilitySlots.map((slot) => ({ ...slot })),
      }));
    },
    async onUpdate({ form }) {
      if (form.valid) {
        const { id, ...payload } = form.data;
        if (payload.link?.url === "") {
          delete payload.link;
        }
        if (form.data.id) {
          console.log("update space");
          handleUpdateSpace(id!, payload);
        } else {
          console.log("create space");
          handleCreateSpace(payload);
        }
      }
    },
  });

  $effect(() => {
    if (hasFormErrors($errors)) scrollToFirstFormError();
  });

  async function handleCreateSpace(payload: SpaceFields) {
    try {
      await spaces.create(activeCalendarId, payload);
      toast.success("Space created!");
      goto("/app/spaces");
    } catch (error) {
      console.error("Error creating space: ", error);
      toast.error("Error creating space!");
    }
  }

  async function handleUpdateSpace(spaceId: Hash, payload: SpaceFields) {
    try {
      await spaces.update(spaceId, payload);
      toast.success("Space updated!");
      goto("/app/spaces");
    } catch (error) {
      console.error("Error updating space: ", error);
      toast.error("Error updating space!");
    }
  }

  function updateLocation(type: "physical" | "gps" | "virtual") {
    if ($form.location.type === type) return;

    if ($form.location.type === "physical") {
      physicalLocationDraft = { ...$form.location };
    } else if ($form.location.type === "gps") {
      gpsLocationDraft = { ...$form.location };
    } else {
      virtualLocationDraft = { ...$form.location };
    }

    if (type === "physical") {
      $form.location = { ...physicalLocationDraft };
    } else if (type === "gps") {
      $form.location = { ...gpsLocationDraft };
    } else {
      $form.location = { ...virtualLocationDraft };
    }
  }
</script>

<SuperDebug data={{ $form, $errors }} />
<form method="POST" use:enhance>
  <fieldset
    role="radiogroup"
    class="mb-3 grid grid-cols-3 gap-1 rounded-sm border border-black bg-grey-medium p-1"
  >
    <legend class="sr-only">Space type</legend>

    <button
      type="button"
      role="radio"
      aria-checked={$form.location.type === "physical"}
      onclick={() => updateLocation("physical")}
      class={`justify-center rounded-sm border border-black bg-light-yellow px-2 py-2 text-center text-[13px] leading-none ${$form.location.type === "physical" ? "ring-2 ring-black" : ""}`}
    >
      physical space
    </button>

    <button
      type="button"
      role="radio"
      aria-checked={$form.location.type === "gps"}
      onclick={() => updateLocation("gps")}
      class={`justify-center rounded-sm border border-black bg-pink-light px-2 py-2 text-center text-[13px] leading-none ${$form.location.type === "gps" ? "ring-2 ring-black" : ""}`}
    >
      GPS coordinates
    </button>

    <button
      type="button"
      role="radio"
      aria-checked={$form.location.type === "virtual"}
      onclick={() => updateLocation("virtual")}
      class={`justify-center rounded-sm border border-black bg-blue-light px-2 py-2 text-center text-[13px] leading-none ${$form.location.type === "virtual" ? "ring-2 ring-black" : ""}`}
    >
      virtual space
    </button>

    {#if $errors.location?.type}<span class="form-error col-span-3"
        >{$errors.location?.type}</span
      >{/if}
  </fieldset>
  <label for="space-name">Space Name*</label>
  <input type="text" name="space-name" bind:value={$form.name} />
  {#if $form.location.type === "physical"}
    <fieldset>
      <label for="address-street">Street</label>
      <input
        type="text"
        name="address-street"
        aria-invalid={$errors.location?.street ? "true" : undefined}
        bind:value={$form.location.street}
      />
      {#if $errors.location?.street}<span class="form-error"
          >{$errors.location?.street}</span
        >{/if}

      <label for="address-city">City</label>
      <input
        type="text"
        name="address-city"
        aria-invalid={$errors.location?.city ? "true" : undefined}
        bind:value={$form.location.city}
      />
      {#if $errors.location?.city}<span class="form-error"
          >{$errors.location?.city}</span
        >{/if}

      <label for="address-state">State</label>
      <input
        type="text"
        name="address-state"
        aria-invalid={$errors.location?.state ? "true" : undefined}
        bind:value={$form.location.state}
      />
      {#if $errors.location?.state}<span class="form-error"
          >{$errors.location?.state}</span
        >{/if}

      <label for="address-zip">Zip</label>
      <input
        type="text"
        name="address-zip"
        aria-invalid={$errors.location?.zip ? "true" : undefined}
        bind:value={$form.location.zip}
      />
      {#if $errors.location?.zip}<span class="form-error"
          >{$errors.location?.zip}</span
        >{/if}

      <label for="address-country">Country</label>
      <input
        type="text"
        name="address-country"
        aria-invalid={$errors.location?.country ? "true" : undefined}
        bind:value={$form.location.country}
      />
      {#if $errors.location?.country}<span class="form-error"
          >{$errors.location?.country}</span
        >{/if}
    </fieldset>
  {:else if $form.location.type === "gps"}
    <fieldset>
      <legend>Co-ordinates</legend>
      <label for="address-lat">Latitude*</label>
      <input
        type="number"
        name="address-lat"
        step="any"
        min="-90"
        max="90"
        aria-invalid={$errors.location?.lat ? "true" : undefined}
        bind:value={$form.location.lat}
      />
      {#if $errors.location?.lat}<span class="form-error"
          >{$errors.location?.lat}</span
        >{/if}
      <label for="address-lon">Longitude*</label>
      <input
        type="number"
        name="address-lon"
        step="any"
        min="-180"
        max="180"
        aria-invalid={$errors.location?.lon ? "true" : undefined}
        bind:value={$form.location.lon}
      />
      {#if $errors.location?.lon}<span class="form-error"
          >{$errors.location?.lon}</span
        >{/if}
    </fieldset>
  {:else if $form.location.type === "virtual"}
    <label for="address-virtual">Link to virtual space*</label>
    <input
      type="text"
      name="address-virtual"
      aria-invalid={$errors.location ? "true" : undefined}
      bind:value={$form.location.link}
    />
    {#if $errors.location}<span class="form-error">{$errors.location.link}</span
      >{/if}
  {/if}

  <label for="capacity">Capacity</label>
  <input
    type="number"
    name="capacity"
    aria-invalid={$errors.capacity ? "true" : undefined}
    bind:value={$form.capacity}
  />
  {#if $errors.capacity}<span class="form-error">{$errors.capacity}</span>{/if}

  <label for="accessibility-details">Accessibility Details*</label>
  <textarea
    name="accessibility-details"
    aria-invalid={$errors.accessibility ? "true" : undefined}
    bind:value={$form.accessibility}
  ></textarea>
  {#if $errors.accessibility}<span class="form-error"
      >{$errors.accessibility}</span
    >{/if}

  <label for="space-description">Space Description*</label>
  <textarea
    name="space-description"
    aria-invalid={$errors.description ? "true" : undefined}
    bind:value={$form.description}
    placeholder="You can use Markdown to format your text. Add any useful information relating to the arrangement (i.e. you will be responsible for pick-up and return, I won’t travel further than East London etc.)"
  ></textarea>
  {#if $errors.description}<span class="form-error">{$errors.description}</span
    >{/if}

  <label for="contact-details">Contact Details*</label>
  <input
    type="text"
    name="contact-details"
    aria-invalid={$errors.contact ? "true" : undefined}
    bind:value={$form.contact}
    placeholder="e.g. phone number, signal code, email"
  />
  {#if $errors.contact}<span class="form-error">{$errors.contact}</span>{/if}

  <fieldset class="mt-4">
    <legend class="mb-2 text-[20px]"
      >🔗 Useful link (website, social media)</legend
    >
    <div class="flex flex-row gap-2">
      <div class="min-w-0 flex-1">
        <!-- TODO: Fix type issue with '$form.link' is possibly being 'null'. -->
        <label for="space-link-text">Link Title</label>
        <input
          id="space-link-text"
          type="text"
          name="space-link-text"
          aria-invalid={$errors.link?.title ? "true" : undefined}
          bind:value={$form.link.title}
          placeholder="Link title"
        />
        {#if $errors.link?.title}<span class="form-error"
            >{$errors.link?.title}</span
          >{/if}
      </div>
      <div class="min-w-0 flex-1">
        <label for="space-link-url">URL</label>
        <input
          id="space-link-url"
          type="url"
          name="space-link-url"
          aria-invalid={$errors.link?.url ? "true" : undefined}
          bind:value={$form.link.url}
          placeholder="http://www.example.com"
        />
        {#if $errors.link?.url}<span class="form-error"
            >{$errors.link?.url}</span
          >{/if}
      </div>
    </div>
  </fieldset>

  <label for="space-message" class="flex items-center gap-1">
    <BubbleIcon size={18} />
    <span>Your message to anyone booking this space*</span>
  </label>
  <input
    type="text"
    name="space-message"
    placeholder="Please let me know in advance if..."
    aria-invalid={$errors.messageForRequesters ? "true" : undefined}
    bind:value={$form.messageForRequesters}
  />
  {#if $errors.messageForRequesters}<span class="form-error"
      >{$errors.messageForRequesters}</span
    >{/if}

  <section class="mt-4 overflow-hidden rounded-sm border border-black">
    <h2
      class="border-b border-black bg-grey-medium px-3 py-2 text-center text-[20px] normal-case"
    >
      Space availability
    </h2>
    <AvailabilitySetter
      bind:availability={availabilitySlots}
      allSelected={legacyAlways}
      bind:currentlySelectedDate={selectedAvailabilityDate}
      {calendarDates}
    />
    {#if $errors.availability}
      <span class="form-error block px-3 pb-2"
        >{$errors.availability._errors}</span
      >
    {/if}
  </section>

  <button
    type="button"
    role="checkbox"
    aria-checked={alwaysAvailable}
    onclick={toggleDayAvailability}
    disabled={!selectedDay}
    aria-label="All time slots available on the selected day"
    class="mt-3 flex w-full cursor-pointer items-center justify-between rounded-sm border border-black bg-grey-medium px-2 py-2 text-left text-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
  >
    <span>Always available <span class="text-[13px]">(selected day)</span></span
    >
    <span
      class={`size-4 shrink-0 rounded-full border-2 border-black ${alwaysAvailable ? "bg-red-light" : "bg-white"}`}
      aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    role="checkbox"
    aria-checked={$form.multiBookable}
    onclick={() => ($form.multiBookable = !$form.multiBookable)}
    class="mt-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm border border-black bg-grey-medium px-2 py-2 text-left text-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
  >
    <span>Can this space have multiple bookings at the same time?</span>
    <span
      class={`size-4 shrink-0 rounded-full border-2 border-black ${$form.multiBookable ? "bg-red-light" : "bg-white"}`}
      aria-hidden="true"
    ></span>
  </button>
  {#if $errors.multiBookable}<span class="form-error"
      >{$errors.multiBookable}</span
    >{/if}

  <ImageUploader bind:images={$form.images as string[]} />

  <br />

  <ActionFormButtons
    id={$form.id!}
    name={$form.name}
    {userRole}
    onSaveDraft={() => {}}
  />
</form>
