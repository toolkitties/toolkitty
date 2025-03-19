import type { PageLoad } from "./$types";
import { users } from "$lib/api";

export const load: PageLoad = async ({ params, parent }) => {
  const spaceId = params.id;

  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  return { title: "spaces", spaceId, userRole };
};
