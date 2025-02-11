import { calendars, inviteCodes } from "$lib/api";
import type { ResolvedCalendar } from "$lib/api/inviteCodes";
import { invoke } from "@tauri-apps/api/core";
import { subscribe } from "./calendars";
import { publicKey } from "./identity";

/**
 * Resolve an invite code to a `ResolvedCalendar`.
 *
 * At this point we know the calendar id, but we still haven't gained access to the calendar
 * itself. For this we need to issue a `CalendarAccessRequested` event and wait for the response
 * to arrive.
 */
export async function resolveInviteCode(
  inviteCode: string,
): Promise<ResolvedCalendar> {
  const calendar = await inviteCodes.resolve(inviteCode);

  return calendar;
}

/**
 * Register that we want to sync events from an author for a certain festival. There are two
 * reasons we want to do this:
 *
 * 1) We observe a "CalendarCreated" event for a calendar we're subscribed to and want to add
 *    therefore want to sync events from the calendar creator.
 * 2) We observe a "CalendarAccessAccepted" event for a calendar we're subscribed to and want to
 *    sync events from the newly added author.
 */
export async function addCalendarAuthor(
  calendarId: Hash,
  publicKey: PublicKey,
) {
  await invoke("add_calendar_author", { calendarId, publicKey });
}

/**
 * Request access to a calendar and subscribe to the "inbox" topic so we can wait for the response.
 */
export async function requestAccess(data: CalendarAccessRequested["data"]) {
  const payload: CalendarAccessRequested = {
    type: "calendar_access_requested",
    data,
  };

  await invoke("publish_to_calendar_inbox", { payload });
}

/**
 * Accept a calendar access request.
 */
export async function acceptAccessRequest(
  data: CalendarAccessAccepted["data"],
) {
  const payload: CalendarAccessAccepted = {
    type: "calendar_access_accepted",
    data,
  };

  await invoke("publish_to_calendar_inbox", { payload });
}

async function onCalendarAccessAccepted(
  meta: StreamMessageMeta,
  data: CalendarAccessAccepted["data"],
) {
  // @TODO: validate that the "acceptor" has authority to accept the access request (eg. they are
  // the owner or an admin).
  let acceptorPublicKey = meta.publicKey;

  // Signal that we are now interested in syncing data for this author.
  await addCalendarAuthor(data.calendarId, data.publicKey);
  
  let myPublicKey = await publicKey();
  if (myPublicKey == data.publicKey) {
    // @TODO: flip the "hasAccess" flag

    // We are now added to the calendar and so will be able to decrypt payloads sent on the calendar
    // data overlay, so we subscribe to that now.
    await subscribe(data.calendarId, "data");
  }
}

export async function process(message: ApplicationMessage) {
  const meta = message.meta;
  const { data, type } = message.data;

  switch (type) {
    case "calendar_access_requested":
      // @TODO: store calendar access request
      return;
    case "calendar_access_accepted":
      return await onCalendarAccessAccepted(meta, data);
  }
}
