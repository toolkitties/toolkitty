import type { PageLoad } from "./$types";
import { users } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load: PageLoad = async ({ url, parent }) => {

  const spaceId = url.searchParams.get('id');
  if (!spaceId) {
    error(404, {
      message: "Space not found",
    });
  }

  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  return { title: "spaces", spaceId, userRole };
};
