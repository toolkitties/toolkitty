import type { PageLoad } from "./$types";
import { spaces, resources, calendars } from "$lib/api";

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId();
  let spacesList = await spaces.findManyWithinCalendarDates(activeCalendarId!);
  let resourcesList = await resources.findMany(activeCalendarId!);

  return { title: "create event", spacesList, resourcesList };
};
