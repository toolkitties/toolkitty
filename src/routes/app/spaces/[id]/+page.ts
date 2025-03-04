import type { PageLoad } from "./$types";
import { spaces } from "$lib/api";

export const load: PageLoad = async ({ params }) => {
  const spaceId = params.id;

  const space = await spaces.findById(spaceId);

  return { title: "spaces", space };
};
