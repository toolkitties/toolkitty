<script lang="ts">
  //   import FestivalCalendar from "./FestivalCalendar.svelte";
  import type { SuperValidated, Infer } from "sveltekit-superforms";
  import type { CalendarSchema } from "$lib/schemas";
  import { calendars } from "$lib/api";
  import { toast } from "$lib/toast.svelte";
  import { goto } from "$app/navigation";
  import { calendarSchema } from "$lib/schemas";
  import { zod } from "sveltekit-superforms/adapters";
  import { superForm } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";

  let { data }: { data: SuperValidated<Infer<CalendarSchema>> } = $props();

  let noEndDate = $state(false);

  const { form, errors, message, constraints, enhance } = superForm(data, {
    SPA: true,
    validators: zod(calendarSchema),
    resetForm: false,
    dataType: "json",
    async onUpdate({ form }) {
      const { id, ...payload } = form.data;
      if (form.data.id) {
        handleUpdateCalendar(id!, payload);
      } else {
        handleCreateCalendar(payload);
      }
    },
  });

  async function handleCreateCalendar(payload: CalendarFields) {
    try {
      await calendars.create({ fields: payload });
      toast.success("Calendar created!");
      goto(`/app/events`);
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
      goto(`/app/events`);
    } catch (error) {
      console.error("Error updating calendar: ", error);
      toast.error("Error updating calendar!");
    }
  }
</script>

<SuperDebug data={{ $form, $errors }} />
<form method="POST" use:enhance>
  <label for="name">Calendar name*</label>
  <input type="text" name="name" required bind:value={$form.name} />
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
        required
        bind:value={$form.dates[0].start}
      />
    </div>
    <div class="end-date">
      <label for="calendar-end-date">End Date *</label>
      <input
        name="calendar-end-date"
        type="date"
        bind:value={$form.dates[0].end}
      />
      <label>
        <input type="checkbox" bind:checked={noEndDate} />
        no end date
      </label>
    </div>
  </div>
  {#if $form.id}
    <label for="description">Festival instructions</label>
    <textarea name="description" bind:value={$form.festivalInstructions}
    ></textarea>
    <label for="description">Spaces page text</label>
    <textarea name="description" bind:value={$form.festivalInstructions}
    ></textarea>
    <label for="description">Resources page text</label>
    <textarea name="description" bind:value={$form.festivalInstructions}
    ></textarea>
    <button type="submit">Update Calendar</button>
  {/if}

  <button type="submit">{$form.id ? "Update" : "Create"}</button>
</form>
