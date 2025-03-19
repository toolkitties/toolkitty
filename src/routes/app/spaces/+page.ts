import type { PageLoad } from "./$types";
import { spaces, calendars } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId } = parentData;
  const spacesList = await spaces.findMany(activeCalendarId!);
  const calendar = await calendars.findOne(activeCalendarId)

  return { title: "spaces", activeCalendarId, spacesList, calendar };
};
