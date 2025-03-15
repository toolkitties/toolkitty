import type { PageLoad } from "./$types";
import { resources, users } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load: PageLoad = async ({ params, parent }) => {
  const resourceId = params.id;
  const resource = await resources.findById(resourceId);

  if (!resource || !resource.id) {
    error(404, {
      message: "Resource not found",
    });
  }

  const parentData = await parent();
  const { activeCalendarId, publicKey } = parentData;
  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user!.role;

  return { title: "resources", resource, userRole };
};
