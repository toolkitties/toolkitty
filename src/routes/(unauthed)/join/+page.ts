import type { PageLoad } from './$types';
import { calendars } from "$lib/api";
import { goto } from '$app/navigation';

export const load: PageLoad = async () => {
  return {
    title: 'welcome'
  };
}