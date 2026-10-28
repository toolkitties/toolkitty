import type { PageLoad } from "./$types";
import { calendarSchema } from "$lib/schemas";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageLoad = async () => {
  const form = defaults(zod(calendarSchema));
  const today = new Date().toISOString().split("T")[0];
  form.data.startDate = `${today}T00:00:00Z`;

  return {
    title: "create new calendar",
    form,
  };
};
