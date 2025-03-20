import type { PageLoad } from "./$types";
import { users } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load: PageLoad = async ({ url, parent }) => {
  const resourceId = url.searchParams.get("id");
  if (resourceId) {
    error(404, {
      message: "Resource not found",
    });
  }

  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  return { title: "resources", resourceId, userRole };
};
