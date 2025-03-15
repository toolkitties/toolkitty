import type { PageLoad } from "./$types";
import { spaces } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId } = parentData;
  const spacesList = await spaces.findMany(activeCalendarId!);

  return { title: "spaces", activeCalendarId, spacesList };
};
