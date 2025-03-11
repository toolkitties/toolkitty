import { resourceSchema } from "$lib/schemas";
import type { PageLoad } from "./$types";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { calendars } from "$lib/api";

export const load: PageLoad = async () => {
  const form = defaults(zod(resourceSchema));
  const activeCalendarId = await calendars.getActiveCalendarId();

  return { form, activeCalendarId };
};
