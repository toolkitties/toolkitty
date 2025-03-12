import type { PageLoad } from "./$types";
import { spaces, resources, calendars } from "$lib/api";
import { eventSchema } from "$lib/schemas";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { db } from "$lib/db";

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId();

  // return spaces and resources with availability within the calendar dates
  let activeCalendar = await db.calendars.get(activeCalendarId!);
  let timeSpan = {
    start: activeCalendar!.startDate!,
    end: activeCalendar!.endDate,
  };
  let spacesList = await spaces.findByTimespan(activeCalendarId!, timeSpan);
  let resourcesList = await resources.findByTimespan(
    activeCalendarId!,
    timeSpan,
  );

  const form = defaults(zod(eventSchema));

  return {
    title: "create event",
    form,
    activeCalendarId,
    spacesList,
    resourcesList,
  };
};
