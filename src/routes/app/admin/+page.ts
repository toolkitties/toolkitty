import type { PageLoad } from "./$types";
import { calendars } from "$lib/api";

export const load: PageLoad = async () => {
  const shareCode = await calendars.getShareCode();
  const activeCalendarId = await calendars.getActiveCalendarId();

  return {
    title: `share`,
    shareCode,
    activeCalendarId,
  };
};
