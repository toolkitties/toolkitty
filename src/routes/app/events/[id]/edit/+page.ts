import type { PageLoad } from "./$types";
import { events, spaces, resources, calendars } from "$lib/api";
import { eventSchema } from "$lib/schemas";
import { error } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageLoad = async ({ params }) => {
  const eventId = params.id;
  const event = await events.findById(eventId);

  if (!event) {
    error(404, {
      message: "Event not found",
    });
  }

  const { calendarId, ownerId, ...eventFields } = event;
  const activeCalendarId = calendarId;
  const form = await superValidate(eventFields, zod(eventSchema));

  const spacesList = await spaces.findMany(activeCalendarId!);
  const resourcesList = await resources.findMany(activeCalendarId!);

  return {
    title: "edit space",
    form,
    activeCalendarId,
    spacesList,
    resourcesList,
  };
};
