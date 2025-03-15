import type { LayoutLoad } from "./$types";
import { calendars, identity } from "$lib/api";

export const load: LayoutLoad = async () => {
  // TODO: move these to reactive global store
  const activeCalendarId = await calendars.getActiveCalendarId();
  const publicKey = await identity.publicKey();

  return {
    activeCalendarId,
    publicKey,
  };
};
