import type { PageLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { resources } from "$lib/api";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { resourceSchema } from "$lib/schemas";

export const load: PageLoad = async ({ params }) => {
  const resourceId = params.id;
  const resource = await resources.findById(resourceId);

  if (!resource || !resource.id) {
    error(404, {
      message: "Resource not found",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { calendarId, ownerId, booked, ...resourceFields } = resource;
  const activeCalendarId = calendarId;

  const form = await superValidate(resourceFields, zod(resourceSchema));

  return { title: "edit resource", form, activeCalendarId };
};
