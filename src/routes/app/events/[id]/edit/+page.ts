import type { PageLoad } from "./$types";
import { events, spaces, resources } from "$lib/api";

export const load: PageLoad = async ({ params }) => {
  const eventId = params.id;

  const event = await events.findById(eventId);

  const spacesList = await spaces.findMany();
  const resourcesList = await resources.findMany();

  return { title: "edit space", spacesList, resourcesList };
};
