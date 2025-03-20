import type { PageLoad } from "./$types";
import { users } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load: PageLoad = async ({ url, parent }) => {
  const eventId = url.searchParams.get("id");
  if (!eventId) {
    error(404, {
      message: "Event not found",
    });
  }

  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  return { title: "events", eventId, userRole };
};
