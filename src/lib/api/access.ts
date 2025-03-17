import {
  auth,
  calendars,
  identity,
  inviteCodes,
  publish,
  topics,
  users,
} from "./";
import type { ResolvedCalendar } from "$lib/api/inviteCodes";
import { publicKey } from "./identity";
import { db } from "$lib/db";
import { toast } from "$lib/toast.svelte";
import { promiseResult } from "$lib/promiseMap";

/*
 * Queries
 */

/*
 * Get pending access requests that have not been accepted yet.
 */
export async function getPending(activeCalendarId: Hash) {
  const accessRequests = await db.accessRequests
    .where({ calendarId: activeCalendarId, status: 'pending' })
    .toArray();
  return accessRequests;
}

export async function findRequestByid(id: Hash) {
  return db.accessRequests.get(id);
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
  const myPublicKey = await publicKey();
  const request = (await db.accessRequests.toArray()).find(
    (request) =>
      request.calendarId == calendarId && request.from == myPublicKey,
  );

  return request != undefined;
}

export async function wasRejected(requestId: Hash): Promise<boolean> {
  const response = (await db.accessResponses.toArray()).find(
    (response) =>
      response.requestId == requestId && response.answer == "reject",
  );

  return response != undefined;
}

/**
 * Check if a peer has access to the calendar. A peer can be understood to "have access"
 * in two possible ways.
 *
 * 1) the peer is owner of the calendar
 * 2) the peer has been given access by the calendar owner or an admin
 */
export async function checkStatus(
  publicKey: PublicKey,
  calendarId: Hash,
): Promise<AccessRequestStatus> {
  const calendar = await calendars.findOne(calendarId);

  // The owner of the calendar automatically has access.
  if (calendar?.ownerId == publicKey) {
    return "accepted";
  }

  // Get all requests made by this author for this calendar.
  const requests = await db.accessRequests
    .where({
      calendarId,
      from: publicKey,
    })
    .toArray();

  let status: AccessRequestStatus = "not requested yet";
  for (const request of requests) {
    // Get all rejections for this request.
    const rejections = await db.accessResponses
      .where({ requestId: request.id, answer: "reject" })
      .toArray();

    // Try to find any single valid rejections, if so mark "status" as "rejected" and move onto
    // the next request.
    for (const rejected of rejections) {
      const isAdmin = await auth.isAdmin(calendarId, rejected.from);
      const isOwner = await calendars.isOwner(calendarId, rejected.from);
      // Only process responses from calendar admins or owners.
      if (isAdmin || isOwner) {
        status = "rejected";
        break;
      }
    }

    // We found a rejection move onto next request.
    if (status == "rejected") {
      continue;
    }

    // No rejections, now get all "accept" responses.
    const acceptances = await db.accessResponses
      .where({
        requestId: request.id,
        answer: "accept",
      })
      .toArray();

    // Try to find any one valid response, if so we're done, return "accepted".
    for (const accepted of acceptances) {
      const isAdmin = await auth.isAdmin(calendarId, accepted.from);
      const isOwner = await calendars.isOwner(calendarId, accepted.from);
      if (isAdmin || isOwner) {
        // Only process responses from calendar admins or owners.
        return "accepted";
      }
    }

    // No accept responses found, we're in "pending" state.
    status = "pending";
  }

  return status;
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

  const [operationId] = await publish.toInbox(
    data.calendarId,
    calendarAccessRequested,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Accept a calendar access request.
 */
export async function acceptAccessRequest(
  data: CalendarAccessAccepted["data"],
): Promise<OperationId> {
  // @TODO: pass calendarId into method.
  const calendarId = await calendars.getActiveCalendarId();

  const amAdmin = await auth.amAdmin(calendarId!);
  const amOwner = await calendars.amOwner(calendarId!);
  if (!amAdmin && !amOwner) {
    throw new Error(
      "user does not have permission to accept an access request for this calender",
    );
  }

  const calendarAccessAccepted: CalendarAccessAccepted = {
    type: "calendar_access_accepted",
    data,
  };

  const [operationId] = await publish.toInbox(
    calendarId!,
    calendarAccessAccepted,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Reject a calendar access request.
 */
export async function rejectAccessRequest(
  data: CalendarAccessAccepted["data"],
) {
  const calendarId = await calendars.getActiveCalendarId();

  const amAdmin = await auth.amAdmin(calendarId!);
  const amOwner = await calendars.amOwner(calendarId!);
  if (!amAdmin && !amOwner) {
    throw new Error(
      "user does not have permission to reject an access request for this calender",
    );
  }

  const calendarAccessRejected: CalendarAccessRejected = {
    type: "calendar_access_rejected",
    data,
  };

  const [operationId] = await publish.toInbox(
    calendarId!,
    calendarAccessRejected,
  );

  await promiseResult(operationId);

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
  const calendarId = data.calendarId;
  const accessRequest = {
    id: meta.operationId,
    calendarId,
    from: meta.author,
    name: data.name,
    message: data.message,
  };

  await db.accessRequests.add(accessRequest);
  const accessStatus = await checkStatus(meta.author, calendarId);

  // Show toast to user with request if owner or admin.
  const amOwner = await calendars.amOwner(calendarId);
  const amAdmin = await auth.amAdmin(calendarId);
  if (accessStatus == "pending" && (amOwner || amAdmin)) {
    toast.accessRequest(accessRequest);
  }

  if (accessStatus == "accepted") {
    // Create a new user.
    if (!(await users.get(calendarId, meta.author))) {
      await users.create(calendarId, meta.author, data.name);
    }
  }
}

async function onCalendarAccessAccepted(
  meta: StreamMessageMeta,
  data: CalendarAccessAccepted["data"],
) {
  const calendarId = meta.stream.id;
  await db.accessResponses.add({
    id: meta.operationId,
    calendarId,
    from: meta.author,
    requestId: data.requestId,
    answer: "accept",
  });

  const request = await db.accessRequests.get(data.requestId);
  if (!request) {
    return;
  }

  const accessStatus = await checkStatus(request.from, calendarId);

  // Process new calendar author if access was accepted.
  if (accessStatus == "accepted") {
    // Create a new user.
    const user = await users.get(calendarId, request.from);
    if (!user) {
      await users.create(calendarId, request.from, request.name);
    }

    // Add the new author to the calendar topics.
    await topics.addAuthorToCalendar(meta.author, meta.stream);
    await topics.addAuthorToInbox(meta.author, meta.stream);

    // If this is our own access request then also add ourselves and the calendar owner to the
    // topic may as we won't have done this before.
    const myPublicKey = await identity.publicKey();
    if (myPublicKey == request.from) {
      await topics.subscribeToCalendar(meta.stream.id);
      await topics.addAuthorToCalendar(myPublicKey, meta.stream);
      await topics.addAuthorToCalendar(meta.stream.owner, meta.stream);
      await topics.addAuthorToInbox(meta.stream.owner, meta.stream);
    }
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
    answer: "reject",
  });
}
