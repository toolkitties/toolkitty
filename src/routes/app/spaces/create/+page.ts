import { spaceSchema } from "$lib/schemas";
import type { PageLoad } from "./$types";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { calendars } from "$lib/api";

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId();
  const form = defaults(zod(spaceSchema));

  return { form, activeCalendarId };
};
