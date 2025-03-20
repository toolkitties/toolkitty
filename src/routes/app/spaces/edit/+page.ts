import type { PageLoad } from "./$types";
import { spaceSchema } from "$lib/schemas";
import { error } from "@sveltejs/kit";
import { spaces, users, calendars } from "$lib/api";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageLoad = async ({ url, parent }) => {
  const spaceId = url.searchParams.get("id");
  if (!spaceId) {
    error(404, {
      message: "Space not found",
    });
  }

  const space = await spaces.findById(spaceId);
  if (!space || !space.id) {
    error(404, {
      message: "Space not found",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { calendarId, ownerId, booked, ...spaceFields } = space;
  const form = await superValidate(spaceFields, zod(spaceSchema));

  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  const calendar = await calendars.findById(activeCalendarId!);
  const calendarDates = { start: calendar!.startDate!, end: calendar!.endDate };

  return {
    title: "edit space",
    form,
    activeCalendarId,
    userRole,
    calendarDates,
  };
};
