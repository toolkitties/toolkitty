import type { PageLoad } from "./$types";
import { events, users } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const eventsList = await events.findMany(activeCalendarId!);
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user?.role;

  return {
    title: "home",
    activeCalendarId,
    eventsList,
    userRole,
  };
};
