import type { PageLoad } from './$types';
import { bookings, calendars, identity } from '$lib/api';

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId()
  const publicKey = await identity.publicKey();
  const pendingRequests = await bookings.findPending(activeCalendarId!, {});

  console.log(pendingRequests)
  return {
    title: `dashboard`,
    pendingRequests,
    activeCalendarId
  };
};