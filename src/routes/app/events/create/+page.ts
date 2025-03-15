import type { PageLoad } from "./$types";
import { spaces, resources, calendars } from "$lib/api";
import { eventSchema } from "$lib/schemas";
import { defaults } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { db } from "$lib/db";
import { TimeSpanClass } from "$lib/timeSpan";

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId();

  // return spaces and resources with availability within the calendar dates
  const activeCalendar = await db.calendars.get(activeCalendarId!);
  const timeSpan = {
    start: activeCalendar!.startDate!,
    end: activeCalendar!.endDate,
  };
  const spacesList = await spaces.findByTimeSpan(
    activeCalendarId!,
    new TimeSpanClass(timeSpan),
  );
  const resourcesList = await resources.findByTimeSpan(
    activeCalendarId!,
    new TimeSpanClass(timeSpan),
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
