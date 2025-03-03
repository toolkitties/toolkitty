import type { PageLoad } from "./$types";
import { calendars } from "$lib/api";

export const load: PageLoad = async ({ params }) => {
  const calendarId = params.id;

  return { title: "edit active calendar", calendarId };
};
