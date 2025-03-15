// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
// We are using Hash routing so we don't need to specify prerendering or ssr here.

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
