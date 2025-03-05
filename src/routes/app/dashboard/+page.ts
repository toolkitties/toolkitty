import type { PageLoad } from './$types';
import { calendars } from '$lib/api';

export const load: PageLoad = async () => {
  const activeCalendarId = await calendars.getActiveCalendarId()

  return {
    title: `dashboard`,
    activeCalendarId
  };
};