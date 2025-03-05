import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { publish } from ".";
import { toast } from "$lib/toast.svelte";
import { identity, spaces, resources } from ".";
import { publicKey } from "./identity";

/**
 * Queries
 */

/**
 * Search the database for any booking requests matching the passed filter object.
 */
export function findAll(
  calendarId: Hash,
  filter: BookingQueryFilter,
): Promise<BookingRequest[]> {
  return db.bookingRequests
    .where({
      calendarId,
      ...filter,
    })
    .toArray();
}

/**
 * Search the database for any pending booking requests matching the passed filter object.
 */
export async function findPending(
  calendarId: Hash,
  filter: BookingQueryFilter,
): Promise<BookingRequest[]> {
  let responsesFilter = {
    answer: "accept",
    calendarId,
  };

  const approvals = await db.bookingResponses.where(responsesFilter).toArray();

  return db.bookingRequests
    .where({
      calendarId,
      ...filter,
    })
    .filter((request) => isPending(request, approvals))
    .toArray();
}

function isPending(
  request: BookingRequest,
  approvals: BookingResponse[],
): boolean {
  return (
    approvals.find((response) => {
      return response.requestId == request.id;
    }) == undefined
  );
}

/**
 * Issue a booking request.
 */
export async function request(
  eventId: Hash,
  resourceId: Hash,
  type: ResourceType,
  message: string,
  timeSpan: TimeSpan,
) {
  let event = await db.events.get(eventId);
  const resourceRequested: BookingRequested = {
    type: "booking_requested",
    data: {
      resourceId,
      type,
      eventId,
      message,
      timeSpan,
    },
  };

  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    event!.calendarId,
    resourceRequested,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Accept a booking request.
 */
export async function accept(requestId: Hash) {
  let bookingRequest = await db.bookingRequests.get(requestId);
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

  await promiseResult(operationId);

  return operationId;
}

/**
 * Reject a booking request.
 */
export async function reject(requestId: Hash) {
  let bookingRequest = await db.bookingRequests.get(requestId);
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

  await promiseResult(operationId);

  return operationId;
}

/*
 * Processor
 */

export async function process(message: ApplicationMessage) {
  const meta = message.meta;
  const { data, type } = message.data;

  switch (type) {
    case "booking_requested":
      return await onBookingRequested(meta, data);
    case "booking_request_accepted":
      return await onBookingRequestAccepted(meta, data);
    case "booking_request_rejected":
      return await onBookingRequestRejected(meta, data);
  }
}

async function onBookingRequested(
  meta: StreamMessageMeta,
  data: BookingRequested["data"],
) {
  let resource;
  if (data.type == "resource") {
    resource = await resources.findById(data.resourceId)
  } else {
    resource = await spaces.findById(data.resourceId)
  }

  const resourceRequest: BookingRequest = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    eventId: data.eventId,
    requester: meta.author,
    resourceId: data.resourceId,
    resourceType: data.type,
    resourceOwner: resource!.ownerId,
    message: data.message,
    timeSpan: data.timeSpan,
  };

  await db.bookingRequests.add(resourceRequest);

  const publicKey = await identity.publicKey();

  // Show toast if we are the owner of the resource and we didn't make the request.
  if (meta.author != publicKey && resource!.ownerId == publicKey) {
    toast.bookingRequest(resourceRequest)
  }
}

async function onBookingRequestAccepted(
  meta: StreamMessageMeta,
  data: BookingRequestAccepted["data"],
) {
  const resourceRequest = await db.bookingRequests.get(data.requestId);

  if (!resourceRequest) {
    throw new Error("resource request does not exist");
  }

  const resourceResponse: BookingResponse = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    eventId: resourceRequest.eventId,
    responder: meta.author,
    requestId: data.requestId,
    answer: "accept",
  };
  await db.bookingResponses.add(resourceResponse);
}

async function onBookingRequestRejected(
  meta: StreamMessageMeta,
  data: BookingRequestRejected["data"],
) {
  const resourceRequest = await db.bookingRequests.get(data.requestId);

  if (!resourceRequest) {
    throw new Error("resource request does not exist");
  }

  const resourceResponse: BookingResponse = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    eventId: resourceRequest.eventId,
    responder: meta.author,
    requestId: data.requestId,
    answer: "reject",
  };
  await db.bookingResponses.add(resourceResponse);
}
