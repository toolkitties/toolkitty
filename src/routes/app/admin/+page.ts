import type { PageLoad } from './$types';
import { access, calendars } from '$lib/api';

export const load: PageLoad = async () => {
  const shareCode = await calendars.getShareCode()
  const activeCalendarId = await calendars.getActiveCalendarId()
  const pendingRequests = await access.getPending(activeCalendarId!)

  console.log(pendingRequests)

  return {
    title: `share`,
    shareCode,
    pendingRequests
  };
};