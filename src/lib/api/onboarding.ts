import { calendars, inviteCodes } from ".";
import type { ResolvedCalendar } from "./inviteCodes";


export async function joinWithInviteCode(
    inviteCode: string,
  ): Promise<ResolvedCalendar> {
    let calendar = await inviteCodes.resolve(inviteCode);
    await calendars.select(calendar.id);
    await calendars.subscribe(calendar.id);

    // @TODO: At this point we've "joined" the calendar but we haven't received the
    // `CalendarCreated` event yet, which will ultimately update our database state when it's
    // handled by the calendar processor. Is there a transitory state we need to handle here?

    return calendar;
}

