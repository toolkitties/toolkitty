import type { PageLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { resources, users, calendars } from "$lib/api";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { resourceSchema } from "$lib/schemas";

export const load: PageLoad = async ({ params, parent }) => {
  const resourceId = params.id;
  const resource = await resources.findById(resourceId);

  if (!resource || !resource.id) {
    error(404, {
      message: "Resource not found",
    });
  }

  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { calendarId, ownerId, ...resourceFields } = resource;

  const form = await superValidate(resourceFields, zod(resourceSchema));

  const calendar = await calendars.findById(activeCalendarId!);
  const calendarDates = { start: calendar!.startDate!, end: calendar!.endDate };

  return {
    title: "edit resource",
    form,
    activeCalendarId,
    userRole,
    calendarDates,
  };
};
