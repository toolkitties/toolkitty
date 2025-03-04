import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const calendarId = params.id;

  return { title: "edit active calendar", calendarId };
};
