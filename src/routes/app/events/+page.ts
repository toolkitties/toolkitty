import type { PageLoad } from "./$types";
import { calendars, events } from "$lib/api";

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId();
  const eventsList = await events.findMany(activeCalendarId!);
  const activeCalendar = await calendars.findOne(activeCalendarId!);

  return { title: "home", activeCalendarId, eventsList, activeCalendar };
};
