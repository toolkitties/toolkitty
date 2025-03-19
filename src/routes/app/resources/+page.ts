import type { PageLoad } from "./$types";
import { calendars, resources } from "$lib/api";

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId();
  const resourcesList = await resources.findMany(activeCalendarId!);
  const calendar = await calendars.findOne(activeCalendarId!)


  return { title: "resources", activeCalendarId, resourcesList, calendar };
};
