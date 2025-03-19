import type { PageLoad } from "./$types";
import { users } from "$lib/api";

export const load: PageLoad = async ({ params, parent }) => {
  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;
  const eventId = params.id;

  return { title: "events", eventId, userRole };
};
