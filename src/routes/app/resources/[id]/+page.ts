import type { PageLoad } from "./$types";
import { resources } from "$lib/api";

export const load: PageLoad = async ({ params }) => {
  const resourceId = params.id;

  const resource = await resources.findById(resourceId);

  return { title: "resources", resource };
};
