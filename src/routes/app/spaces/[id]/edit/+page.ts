import type { PageLoad } from "./$types";
import { spaceSchema } from "$lib/schemas";
import { error } from "@sveltejs/kit";
import { spaces } from "$lib/api";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageLoad = async ({ params }) => {
  const spaceId = params.id;

  const space = await spaces.findById(spaceId);

  if (!space || !space.id) {
    error(404, {
      message: "Space not found",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { calendarId, ownerId, booked, ...spaceFields } = space;
  const activeCalendarId = calendarId;
  const form = await superValidate(spaceFields, zod(spaceSchema));

  return { title: "edit space", form, activeCalendarId };
};
