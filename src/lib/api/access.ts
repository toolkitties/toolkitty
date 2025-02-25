import { calendars, inviteCodes, publish, topics } from "./";
import type { ResolvedCalendar } from "$lib/api/inviteCodes";
import { publicKey } from "./identity";
import { db } from "$lib/db";
import { TopicFactory } from "./topics";


/*
 * Queries
 */


/*
 * Get pending access requests that have not been accepted yet.
 */
export async function getPending() {
  let activeCalendarId = calendars.getActiveCalendarId()
  let accessRequests = await db.accessRequests.where({ calendarId: activeCalendarId }).toArray()

  return accessRequests
}

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

export async function hasRequested(calendarId: Hash): Promise<boolean> {
  let myPublicKey = await publicKey();
  let request = (await db.accessRequests.toArray()).find(
    (request) =>
      request.calendarId == calendarId && request.from == myPublicKey,
  );

  return request != undefined;
}

export async function wasRejected(requestId: Hash): Promise<boolean> {
  let response = (await db.accessResponses.toArray()).find(
    (response) => response.requestId == requestId && !response.accept,
  );

  return response != undefined;
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
    (request) => request.from == publicKey && request.calendarId == calendarId,
  );

  if (request == undefined) {
    return false;
  }

  let response = (await db.accessResponses.toArray()).find(
    (response) => response.requestId == request.id && response.accept,
    // @TODO: We need to be able to check if the response came from the calendar owner but at
    // this point we haven't received the "calendar_created" event yet. It will help when the
    // actual calendar id contains the owner information.
  );

  if (response == undefined) {
    return false;
  }

  return true;
}

/**
 * Request access to a calendar and subscribe to the "inbox" topic so we can wait for the response.
 */
export async function requestAccess(
  data: CalendarAccessRequested["data"],
): Promise<OperationId> {
  const calendarAccessRequested: CalendarAccessRequested = {
    type: "calendar_access_requested",
    data,
  };

  const [operationId, streamId] = await publish.toInbox(
    data.calendarId,
    calendarAccessRequested,
  );
  return operationId;
}

/**
 * Accept a calendar access request.
 */
export async function acceptAccessRequest(
  calendarId: Hash,
  data: CalendarAccessAccepted["data"],
): Promise<OperationId> {
  const calendarAccessAccepted: CalendarAccessAccepted = {
    type: "calendar_access_accepted",
    data,
  };

  const [operationId, streamId] = await publish.toInbox(
    calendarId,
    calendarAccessAccepted,
  );
  return operationId;
}

/**
 * Reject a calendar access request.
 */
export async function rejectAccessRequest(
  calendarId: Hash,
  data: CalendarAccessAccepted["data"],
) {
  const calendarAccessRejected: CalendarAccessRejected = {
    type: "calendar_access_rejected",
    data,
  };

  const [operationId, streamId] = await publish.toInbox(
    calendarId,
    calendarAccessRejected,
  );
  return operationId;
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
    case "calendar_access_rejected":
      return await onCalendarAccessRejected(meta, data);
  }
}

async function onCalendarAccessRequested(
  meta: StreamMessageMeta,
  data: CalendarAccessRequested["data"],
) {
  await db.accessRequests.add({
    id: meta.operationId,
    calendarId: data.calendarId,
    from: meta.author,
    name: data.name,
    message: data.message,
    accepted: false,
  });
  //@TODO: For testing purposes only, we accept any requests for festivals where we are the
  //owner.
  let myPublicKey = await publicKey();
  let hasAccess = await checkHasAccess(meta.author, data.calendarId);
  if (!hasAccess) {
    let calendar = await calendars.findOne(data.calendarId);
    if (calendar?.ownerId == myPublicKey) {
      let message = {
        requestId: meta.operationId,
      };
      await acceptAccessRequest(calendar.id, message);
    }
  }

  await handleRequestOrResponse(data.calendarId, meta.author);
}

async function onCalendarAccessAccepted(
  meta: StreamMessageMeta,
  data: CalendarAccessAccepted["data"],
) {
  await db.accessResponses.add({
    id: meta.operationId,
    calendarId: meta.stream.id,
    from: meta.author,
    requestId: data.requestId,
    accept: true,
  });

  let request = (await db.accessRequests.toArray()).find(
    (request) => request.id == data.requestId,
  );

  if (request != undefined) {
    // set request to approved.
    await db.accessRequests.update(request.id, { accepted: true })

    await handleRequestOrResponse(meta.stream.id, request.from);
  }
}

async function onCalendarAccessRejected(
  meta: StreamMessageMeta,
  data: CalendarAccessRejected["data"],
) {
  await db.accessResponses.add({
    id: meta.operationId,
    calendarId: meta.stream.id,
    from: meta.author,
    requestId: data.requestId,
    accept: false,
  });
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

  let calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    return;
  }

  let stream = await db.streams.get(calendar.id);

  // Inform the backend that there is a new author who may contribute to the calendar.
  const topic = new TopicFactory(calendar.id);
  await topics.addCalendarAuthor(requesterPublicKey, topic.calendar(), {
    stream: stream!,
    logPath: publish.CALENDAR_LOG_PATH,
  });
  await topics.addCalendarAuthor(requesterPublicKey, topic.calendarInbox(), {
    stream: stream!,
    logPath: publish.CALENDAR_INBOX_LOG_PATH,
  });

  let myPublicKey = await publicKey();
  if (myPublicKey != requesterPublicKey) {
    return;
  }

  // We are now added to the calendar and will be able to decrypt payloads sent on the calendar
  // data overlay so we subscribe to the data topic now finally. This will mean we receive the
  // "calendar_created" event on the stream, which in turn means the calendar will be inserted
  // into our database.
  await topics.subscribe(topic.calendar());
}
