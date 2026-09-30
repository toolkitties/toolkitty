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
  import { setError, superForm } from "sveltekit-superforms";
  import SuperDebug from "sveltekit-superforms";
  import ShareIcon from "$lib/components/icons/ShareIcon.svelte";
  import CalendarDateRangePicker from "$lib/components/calendar/CalendarDateRangePicker.svelte";

  let {
    data,
    onDelete,
  }: {
    data: SuperValidated<Infer<CalendarSchema>>;
    onDelete?: () => void;
  } = $props();

  let noEndDate = $state(!data.data.endDate);

  const { form, errors, enhance } = superForm(data, {
    SPA: true,
    validators: zod(calendarSchema),
    resetForm: false,
    dataType: "json",
    async onUpdate({ form }) {
      if (form.valid) {
        if (!noEndDate && !form.data.endDate) {
          setError(form, "endDate", "An end date is required");
          return;
        }

        if (
          form.data.endDate &&
          new Date(form.data.endDate) < new Date(form.data.startDate)
        ) {
          setError(
            form,
            "endDate",
            "The end date cannot be before the start date",
          );
          return;
        }

        const { id, startDate, endDate, ...payload } = form.data;
        const dates = [
          { start: startDate, end: noEndDate ? undefined : endDate },
        ];
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
  <label for="name">Programme name*</label>
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
  {#if !$form.id}
    <CalendarDateRangePicker
      bind:startDate={$form.startDate}
      bind:endDate={$form.endDate}
      bind:noEndDate
    />
    {#if $errors.startDate}
      <span class="form-error">{$errors.startDate}</span>
    {/if}
    {#if !noEndDate && $errors.endDate}
      <span class="form-error">{$errors.endDate}</span>
    {/if}
  {/if}
  {#if $form.id}
    <h3
      id="calendarInstructionsLabel"
      class="bg-grey-medium border border-black rounded-t flex items-center justify-between p-1.5 px-2 border-b border-b-black"
    >
      Page: Home
    </h3>
    <textarea
      name="calendarInstructions"
      aria-labelledby="calendarInstructionsLabel"
      aria-invalid={$errors.calendarInstructions ? "true" : undefined}
      bind:value={$form.calendarInstructions}
      rows="10"
      class="w-full p-2 px-3 resize-y border-t-0 rounded-b rounded-t-none border-l border-r border-b border-black"
      placeholder="Enter your calendar instructions here..."
    ></textarea>
    {#if $errors.calendarInstructions}<span class="form-error"
        >{$errors.calendarInstructions}</span
      >{/if}

    <CalendarDateRangePicker
      bind:startDate={$form.startDate}
      bind:endDate={$form.endDate}
      bind:noEndDate
    />
    {#if $errors.startDate}
      <span class="form-error">{$errors.startDate}</span>
    {/if}
    {#if !noEndDate && $errors.endDate}
      <span class="form-error">{$errors.endDate}</span>
    {/if}

    <h3
      id="spacePageTextLabel"
      class="mt-4 bg-grey-medium border border-black rounded-t flex items-center justify-between p-1.5 px-2 border-b border-b-black"
    >
      Page: Spaces
    </h3>
    <textarea
      name="spacePageText"
      aria-labelledby="spacePageTextLabel"
      aria-invalid={$errors.spacePageText ? "true" : undefined}
      bind:value={$form.spacePageText}
      rows="10"
      class="w-full p-2 px-3 resize-y border-t-0 rounded-b rounded-t-none border-l border-r border-b border-black"
      placeholder="Enter your spaces page text here..."
    ></textarea>
    {#if $errors.spacePageText}<span class="form-error"
        >{$errors.spacePageText}</span
      >{/if}

    <h3
      id="resourcePageTextLabel"
      class="bg-grey-medium border border-black rounded-t flex items-center justify-between p-1.5 px-2 border-b border-b-black"
    >
      Page: Resources
    </h3>
    <textarea
      name="resourcePageText"
      aria-labelledby="resourcePageTextLabel"
      aria-invalid={$errors.resourcePageText ? "true" : undefined}
      bind:value={$form.resourcePageText}
      rows="10"
      class="w-full p-2 px-3 resize-y border-t-0 rounded-b rounded-t-none border-l border-r border-b border-black"
      placeholder="Enter your resources page text here..."
    ></textarea>
    {#if $errors.resourcePageText}<span class="form-error"
        >{$errors.resourcePageText}</span
      >{/if}

    <h3
      id="newsPageTextLabel"
      class="bg-grey-medium border border-black rounded-t flex items-center justify-between p-1.5 px-2 border-b border-b-black"
    >
      Page: News
    </h3>
    <textarea
      name="newsPageText"
      aria-labelledby="newsPageTextLabel"
      aria-invalid={$errors.newsPageText ? "true" : undefined}
      bind:value={$form.newsPageText}
      rows="10"
      class="w-full p-2 px-3 resize-y border-t-0 rounded-b rounded-t-none border-l border-r border-b border-black"
      placeholder="Enter your news page text here..."
    ></textarea>
    {#if $errors.newsPageText}<span class="form-error"
        >{$errors.newsPageText}</span
      >{/if}
  {/if}
  <div class="mt-4 flex flex-col items-center justify-end text-center mb-4">
    <ShareIcon size={28} />
    <span class="text-[15px] mt-3"
      >Calendars are private. Invite others with your calendar code.</span
    >
  </div>
  <div class={`grid gap-2 ${data.data.id && onDelete ? "grid-cols-2" : "grid-cols-1"}`}>
    {#if data.data.id && onDelete}
      <button
        type="button"
        onclick={onDelete}
        class="button button-grey button-delete w-full"
      ><span>delete</span></button>
    {/if}
    <button type="submit" class="button button-green w-full">
      {data.data.id ? "update" : "create"}
    </button>
  </div>
</form>
