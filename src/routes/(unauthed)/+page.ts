import type { PageLoad } from './$types';
import { calendars } from "$lib/api";
import { goto } from '$app/navigation';

export const load: PageLoad = async () => {
  let activeCalendarId = await calendars.getActiveCalendarId();

  // if (activeCalendarId) {
  //   goto("/app/events")
  // }

  return {
    title: 'welcome'
  };
}