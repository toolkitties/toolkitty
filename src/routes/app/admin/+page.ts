import type { PageLoad } from './$types';
import { access, calendars } from '$lib/api';

export const load: PageLoad = async () => {
  const shareCode = await calendars.getShareCode()
  const pendingRequests = await access.getPending()
  return {
    title: `share`,
    shareCode,
    pendingRequests
  };
};