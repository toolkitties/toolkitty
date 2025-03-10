import type { PageLoad } from "./$types";
import { spaces, resources, calendars } from "$lib/api";
import { eventSchema } from "$lib/schemas";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageLoad = async () => {
  const activeCalelendarId = await calendars.getActiveCalendarId();
  let spacesList = await spaces.findMany(activeCalelendarId!);
  let resourcesList = await resources.findMany(activeCalelendarId!);

  const form = defaults(zod(eventSchema));

  return {
    title: "create event",
    form,
    activeCalelendarId,
    spacesList,
    resourcesList,
  };
};
