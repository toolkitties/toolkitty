import type { PageLoad } from "./$types";
import { events, users, calendars } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const eventsList = await events.findMany(activeCalendarId!);
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;
  const calendar = await calendars.findOne(activeCalendarId)

  return {
    title: "home",
    activeCalendarId,
    eventsList,
    userRole,
    calendar
  };
};
