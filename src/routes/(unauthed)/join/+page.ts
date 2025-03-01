import type { PageLoad } from './$types';
import { access, calendars, identity } from "$lib/api";
import { goto } from '$app/navigation';

export const load: PageLoad = async () => {
  let myPublicKey = await identity.publicKey();
  let activeCalendarId = await calendars.getActiveCalendarId()
  let accessStatus = await access.checkStatus(myPublicKey, activeCalendarId!);

  // if we already have access then go to the calendar
  if (accessStatus == 'accepted' || 'owner') {
    goto("/app/events")
  }

  return {
    title: 'request access',
    myPublicKey,
    activeCalendarId,
    accessStatus
  };
}