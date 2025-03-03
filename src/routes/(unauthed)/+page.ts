import type { PageLoad } from './$types';
import { calendars } from "$lib/api";
import { goto } from '$app/navigation';

export const load: PageLoad = async () => {
  let activeCalendarId = await calendars.getActiveCalendarId();

  // TODO: check if user has access to active calendar before going to the calendar
  // If access is pending then go to join/pending page.
  if (activeCalendarId) {
    goto("/app/events")
  }

  return {
    title: 'welcome'
  };
}