import type { PageLoad } from "./$types";
import { calendars, events } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId();
  const eventsList = await events.findMany(activeCalendarId!);

  error(404, {
    message: 'Not found'
  });

  return { title: "home", activeCalendarId, eventsList };
};
