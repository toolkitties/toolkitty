import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { invoke } from "@tauri-apps/api/core";
import { TopicFactory } from "./topics";
import { toast } from "$lib/toast.svelte";
import { publish, identity, spaces, resources } from ".";
import { liveQuery } from "dexie";
/**
 * Queries
 */

export function findRequest(
  requestId: Hash,
): Promise<BookingRequest | undefined> {
  return db.bookingRequests.get(requestId);
}

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
// @TODO: It's tricky to test live queries, and maybe anyway it's nice to differentiate between
// methods which are "live" and those which are not. Could we post-fix their name with 'Live'? and
// have them as wrappers around a "non-live" variant?
export async function findPending(
  calendarId: Hash,
  filter: BookingQueryFilter,
) {
  let responsesFilter = {
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
  const amOwner = await spaces.amOwner(bookingRequest!.resourceId);
  if (bookingRequest!.resourceType == "space") {
    if (!amOwner) {
      throw new Error(
        "user does not have permission to accept booking request for this space",
      );
    }
  } else if (bookingRequest!.resourceType == "resource") {
    const amOwner = await resources.amOwner(bookingRequest!.resourceId);
    if (!amOwner) {
      throw new Error(
        "user does not have permission to accept booking request for this resource",
      );
    }
  }

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

  const amOwner = await resources.amOwner(bookingRequest!.resourceId);
  if (!amOwner) {
    throw new Error(
      "user does not have permission to reject booking request for this resource",
    );
  }

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
    resource = await resources.findById(data.resourceId);
  } else {
    resource = await spaces.findById(data.resourceId);
  }

  const resourceRequest: BookingRequest = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    requester: meta.author,
    resourceType: data.type,
    resourceOwner: resource!.ownerId,
    ...data,
  };

  await db.bookingRequests.add(resourceRequest);

  // @TODO: move this into new "crdt" API.
  // Replay un-ack'd messages which we may have received out-of-order.
  const topic = new TopicFactory(meta.stream.id);
  await invoke("replay", { topic: topic.calendar() });
  const publicKey = await identity.publicKey();

  // Check if we own the resource, otherwise do nothing
  if (resource?.ownerId == publicKey) {
    if (meta.author == publicKey) {
      // Automatically accept resource if we are the owner and we make the request
      await accept(meta.operationId);
    } else {
      // Show toast if we are the owner of the resource and we didn't make the request.
      toast.bookingRequest(resourceRequest);
    }
  }
}

async function onBookingRequestAccepted(
  meta: StreamMessageMeta,
  data: BookingRequestAccepted["data"],
) {
  const resourceRequest = await db.bookingRequests.get(data.requestId);
  const resourceResponse: BookingResponse = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    eventId: resourceRequest!.eventId,
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
  const resourceResponse: BookingResponse = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    eventId: resourceRequest!.eventId,
    responder: meta.author,
    requestId: data.requestId,
    answer: "reject",
  };
  await db.bookingResponses.add(resourceResponse);
}
