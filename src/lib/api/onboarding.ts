import { calendars, inviteCodes } from "$lib/api";
import type { ResolvedCalendar } from "$lib/api/inviteCodes";

export async function joinWithInviteCode(
  inviteCode: string,
): Promise<ResolvedCalendar> {
  const calendar = await inviteCodes.resolve(inviteCode);

  await calendars.select(calendar.id);
  await calendars.subscribe(calendar.id, "inbox");

  // @TODO: At this point we've "joined" the calendar but we haven't received
  // the `CalendarCreated` event yet, which will ultimately update our database
  // state when it's handled by the calendar processor. Is there a transitory
  // state we need to handle here?

  return calendar;
}