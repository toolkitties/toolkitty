<script lang="ts">
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { ResourceSchema } from "$lib/schemas";
  import { superForm } from "sveltekit-superforms";
  import ActionFormButtons from "$lib/components/ActionFormButtons.svelte";
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import ImageUploader from "$lib/components/ImageUploader.svelte";
  import BubbleIcon from "$lib/components/icons/BubbleIcon.svelte";
  import { resources } from "$lib/api";
  import { resourceSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";
  import { parseDate, type DateValue } from "@internationalized/date";
  import {
    availabilityTimeSlots,
    slotDateTime,
  } from "$lib/utils/availabilitySlots";

  let {
    data,
    activeCalendarId,
    calendarDates,
    userRole,
  }: {
    data: SuperValidated<Infer<ResourceSchema>>;
    activeCalendarId: Hash;
    calendarDates: TimeSpan;
    userRole: string;
  } = $props();
  let legacyAlways = $state(data.data.availability === "always");
  let selectedAvailabilityDate: DateValue | undefined = $state(
    parseDate(calendarDates.start.split("T")[0]),
  );
  let availabilitySlots: TimeSpan[] = $state(
    Array.isArray(data.data.availability) ? data.data.availability : [],
  );
  let selectedDay = $derived(
    selectedAvailabilityDate?.toString().split("T")[0],
  );
  let allDayAvailable = $derived(
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

    const clearDay = allDayAvailable;
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
    validators: zod(resourceSchema),
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
    // onUpdate is called when we press submit
    async onUpdate({ form }) {
      if (form.valid) {
        // TODO: add additional validation here
        const { id, ...payload } = form.data;

        // Strip out link if url is undefined or empty string
        if (payload.link?.url === "") {
          delete payload.link;
        }
        if (id) {
          console.log("update resource");
          handleUpdateResource(id, payload);
        } else {
          console.log("create resource");
          handleCreateResource(payload);
        }
      }
    },
  });

  async function handleCreateResource(payload: ResourceFields) {
    try {
      const resourceId: Hash = await resources.create(
        activeCalendarId,
        payload,
      );
      toast.success("Resource created!");
      goto(`/app/resources/view?id=${resourceId}`);
    } catch (error) {
      toast.error("Error creating resource!");
      console.error("Error creating resource:", error);
    }
  }

  async function handleUpdateResource(
    resourceId: Hash,
    payload: ResourceFields,
  ) {
    try {
      await resources.update(resourceId, payload);
      toast.success("Resource updated!");
      goto(`/app/resources/view?id=${resourceId}`);
    } catch (error) {
      toast.error("Error updating resource!");
      console.error("Error updating resource:", error);
    }
  }
</script>

<form method="POST" use:enhance>
  <label for="name">Resource Name*</label>
  <input
    type="text"
    name="name"
    bind:value={$form.name}
    class=""
    aria-invalid={$errors.name ? "true" : undefined}
  />
  {#if $errors.name}<span class="form-error">{$errors.name}</span>{/if}

  <label for="description">Description*</label>
  <textarea
    name="description"
    aria-invalid={$errors.description ? "true" : undefined}
    bind:value={$form.description}
    placeholder="You can use Markdown to format your text. Add any useful information relating to the arrangement (i.e. you will be responsible for pick-up and return, I won’t travel further than East London etc.)"
  ></textarea>
  {#if $errors.description}<span class="form-error">{$errors.description}</span
    >{/if}

  <label for="contact">Contact Details*</label>
  <input
    type="text"
    name="contact"
    aria-invalid={$errors.contact ? "true" : undefined}
    bind:value={$form.contact}
    placeholder="e.g. phone number, signal code, email"
  />
  {#if $errors.contact}<span class="form-error">{$errors.contact}</span>{/if}

  <fieldset class="mt-4">
    <legend class="mb-2 text-[20px]">
      🔗 Useful link (website, social media)
    </legend>
    <div class="flex flex-row gap-2">
      <div class="min-w-0 flex-1">
        <label for="link-text">Link Title</label>
        <input
          id="link-text"
          type="text"
          name="title"
          aria-invalid={$errors.link?.title ? "true" : undefined}
          bind:value={$form.link.title}
          placeholder="Link title"
        />
        {#if $errors.link?.title}<span class="form-error"
            >{$errors.link.title}</span
          >{/if}
      </div>
      <div class="min-w-0 flex-1">
        <label for="link-url">URL</label>
        <input
          id="link-url"
          type="url"
          name="link-url"
          aria-invalid={$errors.link?.url ? "true" : undefined}
          bind:value={$form.link.url}
          placeholder="http://www.example.com"
        />
        {#if $errors.link?.url}<span class="form-error">{$errors.link.url}</span
          >{/if}
      </div>
    </div>
  </fieldset>

  <label for="resource-message" class="flex items-center gap-1">
    <BubbleIcon size={18} />
    <span>Your message to anyone booking this resource</span>
  </label>
  <input
    type="text"
    name="resource-message"
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
      Resource availability
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
    aria-checked={allDayAvailable}
    onclick={toggleDayAvailability}
    disabled={!selectedDay}
    aria-label="All time slots available on the selected day"
    class="mt-3 flex w-full cursor-pointer items-center justify-between rounded-sm border border-black bg-grey-medium px-2 py-2 text-left text-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
  >
    <span>Always available <span class="text-[13px]">(selected day)</span></span
    >
    <span
      class={`size-4 shrink-0 rounded-full border-2 border-black ${allDayAvailable ? "bg-red-light" : "bg-white"}`}
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
    <span>Can this resource have multiple bookings at the same time?</span>
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
