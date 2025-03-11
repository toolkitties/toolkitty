import type { PageLoad } from "./$types";
import { calendarSchema } from "$lib/schemas";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageLoad = async () => {
  const form = defaults(zod(calendarSchema));

  return {
    title: "create calendar",
    form,
  };
};
