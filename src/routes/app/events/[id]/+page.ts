import type { PageLoad } from "./$types";
import { events, users } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load: PageLoad = async ({ params, parent }) => {
  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;
  const eventId = params.id;

  const event = await events.findById(eventId);

  if (!event) {
    error(404, {
      message: "Resource not found",
    });
  }

  return { title: "events", event, userRole };
};
