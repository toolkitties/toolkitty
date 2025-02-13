import { calendars, inviteCodes } from "$lib/api";
import type { ResolvedCalendar } from "$lib/api/inviteCodes";
import { invoke } from "@tauri-apps/api/core";
import { addCalendarAuthor, subscribe } from "./calendars";
import { publicKey } from "./identity";
import { db } from "$lib/db";

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
 * Check if a peer has access to the calendar. A peer can be understood to "have access" 
 * in two possible ways.
 * 
 * 1) the peer is owner of the calendar
 * 2) the peer has been given access by the calendar owner
 */
export async function checkHasAccess(
  publicKey: PublicKey,
  calendarId: Hash,
): Promise<boolean> {
  let calendar = await calendars.findOne(calendarId);

  // The owner of the calendar automatically has access.
  if (calendar?.ownerId == publicKey) {
    return true;
  }

  // Check if the peer has been given access by the calendar owner.
  let request = (await db.accessRequests.toArray()).find(
    (request) =>
      request.publicKey == publicKey && request.calendarId == calendarId,
  );

  if (!request) {
    return false;
  }

  let response = (await db.accessResponses.toArray()).find(
    (response) =>
      response.requestId == request.id &&
      response.accept &&
      // The response must come from the calendar owner.
      response.from == calendar?.ownerId,
  );

  if (!response) {
    return false;
  }

  return true;
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

/**
 * There are two paths to getting access to a calendar. 1) the creator of the calendar is the
 * "owner" and has access by default 2) a peer has requested access and received an access
 * accepted message from the calendar owner. A flow diagram for all access states can be seen 
 * below.
 * 
 *    ┌──────────────────────────────────────────┐
 *    │                                          │
 *    │                                          │
 *    │                    ┌─────────────► Access Rejected
 *    │                    │
 *    │                    │
 *    │                    │
 *    │
 *    │  ┌─────────► Access Requested ───► Access Accepted ────────┐
 *    │  │                                                         │
 *    │  │                                                         │
 *    │  │                                                         │
 *    ▼  │                                                         ▼
 *  No Access─────► Calendar Created ─────────────────────────► Has Access
 *
 *
 * Access messages are all handled in the access processor. We need to detect and handle
 * two distinct states: 
 * 
 * 1) any author gained access to a calendar
 * 2) we gained access to a calendar
 * 
 * In the case of 1) the only thing we need to do is inform the backend that we want to sync data
 * from this author for the calendar they have access to. In the case of one, we want to do the
 * same, but also subscribe to the calendar "data" topic (as we didn't have access, this won't
 * have been done yet).
 * 
 * Additionally requests and responses are stored in the database, we can query these tables to
 * infer if any peer has access to a certain festival. 
 * 
 */
export async function process(message: ApplicationMessage) {
  const meta = message.meta;
  const { data, type } = message.data;

  switch (type) {
    case "calendar_access_requested":
      return await onCalendarAccessRequested(meta, data);
    case "calendar_access_accepted":
      return await onCalendarAccessAccepted(meta, data);
    // @TODO(sam): handle `calendar_access_rejected`
  }
}

async function onCalendarAccessRequested(
  meta: StreamMessageMeta,
  data: CalendarAccessRequested["data"],
) {
  await db.accessRequests.add({
    id: meta.calendarId,
    calendarId: data.calendarId,
    publicKey: meta.publicKey,
  });

  await handleRequestOrResponse(meta.calendarId, meta.publicKey);
}

async function onCalendarAccessAccepted(
  meta: StreamMessageMeta,
  data: CalendarAccessAccepted["data"],
) {
  await db.accessResponses.add({
    id: meta.operationId,
    from: meta.publicKey,
    requestId: data.requestId,
    accept: true,
  });

  let request = (await db.accessRequests.toArray()).find(
    (request) => request.id == data.requestId,
  );

  if (request) {
    await handleRequestOrResponse(meta.calendarId, request.publicKey);
  }
}

/**
 * When we receive a request or response we want to perform the same checks to see if the peer has
 * access. Messages may arrive out-of-order so we can't assume the request is always present when
 * we receive a response. We determine a peer to have access to a festival when a
 * `calendar_access_requested` and it's `calendar_access_accepted` counterpart are present.
 */
async function handleRequestOrResponse(
  calendarId: Hash,
  requesterPublicKey: PublicKey,
) {
  let hasAccess = await checkHasAccess(requesterPublicKey, calendarId);
  if (!hasAccess) {
    return;
  }

  // Inform the backend that there is a new author who may contribute to the calendar.
  await addCalendarAuthor(calendarId, requesterPublicKey);

  let myPublicKey = await publicKey();
  if (myPublicKey != requesterPublicKey) {
    return;
  }

  // We are now added to the calendar and will be able to decrypt payloads sent on the calendar
  // data overlay so we subscribe to the data topic now finally. This will mean we receive the
  // "calendar_created" event on the stream, which in turn means the calendar will be inserted
  // into our database.
  await subscribe(calendarId, "data");
}
