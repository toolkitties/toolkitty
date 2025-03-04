import type { PageLoad } from "./$types";
import { calendars, spaces } from "$lib/api";

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId();
  const spacesList = await spaces.findMany();

  return { title: "spaces", activeCalendarId, spacesList };
};
