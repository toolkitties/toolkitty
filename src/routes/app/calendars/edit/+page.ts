import type { PageLoad } from "./$types";
import { calendarSchema } from "$lib/schemas";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { calendars } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId } = parentData;
  const calendar = await calendars.findOne(activeCalendarId);
  const form = await superValidate(calendar, zod(calendarSchema));

  return {
    title: "edit calendar",
    form,
  };
};
