import type { LayoutLoad } from "./$types";
import { goto } from "$app/navigation";

export const load: LayoutLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId } = parentData;

  if (!activeCalendarId) {
    goto("/");
  }

  return {
    activeCalendarId: activeCalendarId as string,
  };
};
