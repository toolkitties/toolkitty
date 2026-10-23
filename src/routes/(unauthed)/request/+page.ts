import type { PageLoad } from "./$types";
import { access, calendars, identity } from "$lib/api";
import { redirect } from "@sveltejs/kit";

export const load: PageLoad = async () => {
  const myPublicKey = await identity.publicKey();
  const activeCalendarId = await calendars.getActiveCalendarId();

  if (!activeCalendarId) {
    return {
      title: "request access",
      myPublicKey,
      activeCalendarId: undefined,
      accessStatus: "not requested yet" as const,
    };
  }

  const accessStatus = await access.checkStatus(myPublicKey, activeCalendarId);

  // if we already have access then go to the calendar
  if (accessStatus === "accepted") {
    redirect(307, "/app/events");
  }

  return {
    title: "request access",
    myPublicKey,
    activeCalendarId,
    accessStatus,
  };
};
