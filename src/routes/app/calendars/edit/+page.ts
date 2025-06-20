import type { PageLoad } from "./$types";
import { calendarSchema } from "$lib/schemas";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { calendars, users } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const calendar = await calendars.findById(activeCalendarId);
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;
  const form = await superValidate(calendar, zod(calendarSchema));

  return {
    title: "edit calendar",
    form,
    userRole,
  };
};
