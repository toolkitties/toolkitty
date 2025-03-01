import { db } from "$lib/db";
import { publish } from ".";

/**
 * Queries
 */

export async function findAllForAuthor(
  calendarId: Hash,
  requester: PublicKey,
): Promise<BookingRequest[]> {
  return db.transaction("r", db.requests, db.responses, async () => {
    return await db.requests
      .where({
        calendarId,
        requester,
      })
      .filter((request) => isPending(request))
      .toArray();
  });
}

export async function findPendingForAuthor(
  calendarId: Hash,
  requester: PublicKey,
): Promise<BookingRequest[]> {
  return db.transaction("r", db.requests, db.responses, async () => {
    return await db.requests
      .where({
        calendarId,
        requester,
      })
      .filter((request) => isPending(request))
      .toArray();
  });
}

export async function findPendingForEvent(
  eventId: Hash,
): Promise<BookingRequest[]> {
  return db.transaction("r", db.requests, db.responses, async () => {
    return await db.requests
      .where({
        eventId,
      })
      .filter((request) => isPending(request))
      .toArray();
  });
}

function isPending(request: BookingRequest): boolean {
  const response = db.transaction("r", db.responses, async () => {
    await db.responses.get({ requestId: request.id });
  });
  return response != undefined;
}

/**
 * Get one request by its ID
 */
export async function findById(id: Hash): Promise<BookingRequest | undefined> {
  //TODO: Return events from db

  // return test data.
  return;
}

export async function request(
  eventId: Hash,
  targetId: Hash,
  message: string,
  timeSpan: TimeSpan,
) {
  let event = await db.events.get(eventId);
  const resourceRequested: BookingRequested = {
    type: "booking_requested",
    data: {
      targetId,
      eventId,
      message,
      timeSpan,
    },
  };

  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    event!.calendarId,
    resourceRequested,
  );

  return operationId;
}

export async function accept(requestId: Hash) {
  let bookingRequest = await db.requests.get(requestId);
  const bookingRequested: BookingRequestAccepted = {
    type: "booking_request_accepted",
    data: {
      requestId,
    },
  };

  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    bookingRequest!.calendarId,
    bookingRequested,
  );

  return operationId;
}

export async function reject(requestId: Hash) {
  let bookingRequest = await db.requests.get(requestId);
  const bookingRequested: BookingRequestRejected = {
    type: "booking_request_rejected",
    data: {
      requestId,
    },
  };

  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    bookingRequest!.calendarId,
    bookingRequested,
  );

  return operationId;
}

//TODO: Add processor
