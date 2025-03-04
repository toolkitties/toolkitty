import type { PageLoad } from "./$types";
import { events } from "$lib/api";

export const load: PageLoad = async ({ params }) => {
  const eventId = params.id;

  const event = await events.findById(eventId);

  return { title: "events", event };
};
