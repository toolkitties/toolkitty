import type { PageLoad } from "./$types";
import { spaces, resources } from "$lib/api";

export const load: PageLoad = async () => {
  let spacesList = spaces.findMany();
  let resourcesList = resources.findMany();

  return { title: "create event", spacesList, resourcesList };
};
