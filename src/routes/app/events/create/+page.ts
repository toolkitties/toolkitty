import type { PageLoad } from "./$types";
import { spaces, resources, calendars } from "$lib/api";

export const load: PageLoad = async () => {
  const calendarId = await calendars.getActiveCalendarId();
  let spacesList = await spaces.findManyWithinCalendarDates(calendarId!);
  let resourcesList = await resources.findMany(calendarId!);

  return { title: "create event", spacesList, resourcesList };
};
