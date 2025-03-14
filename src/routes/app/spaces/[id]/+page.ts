import type { PageLoad } from "./$types";
import { spaces, users } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load: PageLoad = async ({ params, parent }) => {
  const spaceId = params.id;
  const space = await spaces.findById(spaceId);

  if (!space) {
    error(404, {
      message: "Resource not found",
    });
  }

  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  return { title: "spaces", space, userRole };
};
