<!-- 
 @component
 Form for creating and updating a calendar
  -->

<script lang="ts">
  //   import FestivalCalendar from "./FestivalCalendar.svelte";
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { CalendarSchema } from "$lib/schemas";
  import { calendars } from "$lib/api";
  import { toast } from "$lib/toast.svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { calendarSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { superForm } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";

  let { data }: { data: SuperValidated<Infer<CalendarSchema>> } = $props();

  let noEndDate = $state(false);

  const { form, errors, enhance } = superForm(data, {
    SPA: true,
    validators: zod(calendarSchema),
    resetForm: false,
    dataType: "json",
    async onUpdate({ form }) {
      if (form.valid) {
        const { id, startDate, endDate, ...payload } = form.data;
        const dates = [{ start: startDate, end: endDate }];
        if (form.data.id) {
          handleUpdateCalendar(id!, { dates, ...payload });
        } else {
          handleCreateCalendar({ dates, ...payload });
        }
      }
    },
  });

  async function handleCreateCalendar(payload: CalendarFields) {
    try {
      const newCalendar = await calendars.create({ fields: payload });
      // Set active calendar to new calendar
      await calendars.setActiveCalendar(newCalendar[1]);
      toast.success("Calendar created!");
      // Reload data all data in the app as we changed to a new calendar.
      await invalidateAll();
      // TODO: Automatically reload app data when active calendar changes.
      goto("/app/events");
    } catch (error) {
      console.error("Error creating calendar: ", error);
      toast.error("Error creating calendar!");
    }
  }

  async function handleUpdateCalendar(
    calendarId: Hash,
    payload: CalendarFields,
  ) {
    try {
      await calendars.update(calendarId, payload);
      toast.success("Calendar updated!");
      goto("/app/events");
    } catch (error) {
      console.error("Error updating calendar: ", error);
      toast.error("Error updating calendar!");
    }
  }
</script>

<SuperDebug data={{ $form, $errors }} />
<form method="POST" use:enhance>
  <label for="name">Calendar name*</label>
  <input
    type="text"
    name="name"
    aria-invalid={$errors.name ? "true" : undefined}
    bind:value={$form.name}
  />
  {#if $errors.name}<span class="form-error">{$errors.name}</span>{/if}

  {#if !$form.id}
    <label for="name">Your name*</label>
    <input
      type="text"
      name="username"
      aria-invalid={$errors.userName ? "true" : undefined}
      bind:value={$form.userName}
    />
    {#if $errors.userName}<span class="form-error">{$errors.userName}</span
      >{/if}
  {/if}

  <!--
  Not including this yet because non-continuous calendar dates aren't aren't reflected
  in the calendar fields yet - but you could set them with the FestivalCalendar.
  Would be a consideration for form validation, we would need to make sure EITHER the
  dates have been selected in the calendar or as start and end/no end -->
  <!-- <FestivalCalendar selectMultiple={true} /> -->
  <div class="flex flex-row">
    <div class="start-date">
      <label for="calendar-start-date">Start Date *</label>
      <input
        name="calendar-start-date"
        type="date"
        bind:value={$form.startDate}
      />
    </div>
    <div class="end-date">
      <label for="calendar-end-date">End Date *</label>
      <input
        name="calendar-end-date"
        type="date"
        bind:value={$form.endDate}
        min={$form.startDate}
        disabled={noEndDate}
      />
      <label>
        <input type="checkbox" bind:checked={noEndDate} />
        no end date
      </label>
    </div>
  </div>
  {#if $form.id}
    <label for="calendarInstructions">About your calendar</label>
    <textarea
      name="calendarInstructions"
      aria-invalid={$errors.calendarInstructions ? "true" : undefined}
      bind:value={$form.calendarInstructions}
    ></textarea>
    {#if $errors.calendarInstructions}<span class="form-error"
        >{$errors.calendarInstructions}</span
      >{/if}

    <label for="spacePageText">Spaces page text</label>
    <textarea
      name="spacePageText"
      aria-invalid={$errors.spacePageText ? "true" : undefined}
      bind:value={$form.spacePageText}
    ></textarea>
    {#if $errors.spacePageText}<span class="form-error"
        >{$errors.spacePageText}</span
      >{/if}

    <label for="resourcePageText">Resources page text</label>
    <textarea
      name="resourcePageText"
      aria-invalid={$errors.resourcePageText ? "true" : undefined}
      bind:value={$form.resourcePageText}
    ></textarea>
    {#if $errors.resourcePageText}<span class="form-error"
        >{$errors.resourcePageText}</span
      >{/if}
  {/if}
  <button type="submit" class="button button-green w-full"> create </button>
</form>
