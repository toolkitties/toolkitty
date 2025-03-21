import { resourceSchema } from "$lib/schemas";
import type { PageLoad } from "./$types";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { calendars } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId } = parentData;

  const form = defaults(zod(resourceSchema));

  const calendar = await calendars.findById(activeCalendarId!);
  const calendarDates = { start: calendar!.startDate!, end: calendar!.endDate };

  return { title: "create resource", form, activeCalendarId, calendarDates };
};
