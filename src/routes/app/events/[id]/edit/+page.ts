import type { PageLoad } from "./$types";
import { events, spaces, resources, calendars } from "$lib/api";
import { eventSchema } from "$lib/schemas";
import { error } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { db } from "$lib/db";

export const load: PageLoad = async ({ params }) => {
  const eventId = params.id;
  const event = await events.findById(eventId);

  if (!event) {
    error(404, {
      message: "Event not found",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { calendarId, ownerId, ...eventFields } = event;
  const form = await superValidate(eventFields, zod(eventSchema));

  // return spaces and resources with availability within the calendar dates
  let activeCalendar = await db.calendars.get(calendarId!);
  let timeSpan = {
    start: activeCalendar!.startDate,
    end: activeCalendar!.endDate,
  };
  let spacesList = await spaces.findByTimespan(calendarId!, timeSpan);
  const resourcesList = await resources.findByTimespan(calendarId!, timeSpan);

  return {
    title: "edit space",
    form,
    calendarId,
    spacesList,
    resourcesList,
  };
};
