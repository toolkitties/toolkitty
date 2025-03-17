import type { PageLoad } from "./$types";
import { calendars, users } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const shareCode = await calendars.getShareCode();
  const activeCalendarId = await calendars.getActiveCalendarId();
  const user = await users.get(activeCalendarId!, parentData.publicKey);
  const userRole = user!.role;

  return {
    title: `share`,
    shareCode,
    activeCalendarId,
    userRole
  };
};
