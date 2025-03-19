import type { PageLoad } from "./$types";
import { users, calendars } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;
  const calendar = await calendars.findOne(activeCalendarId)

  return {
    title: "home",
    activeCalendarId,
    userRole,
    calendar
  };
};
