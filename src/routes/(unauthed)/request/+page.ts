import type { PageLoad } from "./$types";
import { access, calendars, identity } from "$lib/api";
import { goto } from "$app/navigation";

export const load: PageLoad = async () => {

  // Invalidate the layout data so we get latest active calendar
  // TODO: move active calendar to reactive object so we don't need to invalidate the layout data

  const myPublicKey = await identity.publicKey();
  const activeCalendarId = await calendars.getActiveCalendarId();
  const accessStatus = await access.checkStatus(myPublicKey, activeCalendarId!);

  // if we already have access then go to the calendar
  if (accessStatus == "accepted") {
    goto("#/app/events");
  }

  return {
    title: "request access",
    myPublicKey,
    activeCalendarId,
    accessStatus,
  };
};
