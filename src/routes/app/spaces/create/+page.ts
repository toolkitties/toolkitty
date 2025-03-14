import { spaceSchema } from "$lib/schemas";
import type { PageLoad } from "./$types";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId } = parentData;

  const form = defaults(zod(spaceSchema));

  return { form, activeCalendarId };
};
