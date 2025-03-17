import type { PageLoad } from "./$types";
import { users } from "$lib/api";

export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  return {
    title: "home",
    activeCalendarId,
    userRole,
  };
};
