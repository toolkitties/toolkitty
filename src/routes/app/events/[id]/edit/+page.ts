import type { PageLoad } from "./$types";
import { events, spaces, resources, calendars } from "$lib/api";

export const load: PageLoad = async ({ params }) => {
  const activeCalendarId = await calendars.getActiveCalendarId();
  const eventId = params.id;

  const event = await events.findById(eventId);

  const spacesList = await spaces.findMany(activeCalendarId!);
  const resourcesList = await resources.findMany(activeCalendarId!);

  return { title: "edit space", spacesList, resourcesList, event };
};
