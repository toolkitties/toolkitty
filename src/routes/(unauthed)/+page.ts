import type { PageLoad } from './$types';
import { calendars } from "$lib/api";

export const load: PageLoad = async () => {
  let activeCalendarId = await calendars.getActiveCalendarId();
  console.log(activeCalendarId);

  return {
    activeCalendarId
  };
}