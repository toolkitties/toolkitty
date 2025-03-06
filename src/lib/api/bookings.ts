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
export function findPending(calendarId: Hash, filter: BookingQueryFilter) {
  return liveQuery(async () => {
    let responsesFilter = {
      calendarId,
    };

    const approvals = await db.bookingResponses
      .where(responsesFilter)
      .toArray();

    return db.bookingRequests
      .where({
        calendarId,
        ...filter,
      })
      .filter((request) => isPending(request, approvals))
      .toArray();
  });
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

  const amOwner = await resources.amOwner(bookingRequest!.resourceId);
  if (!amOwner) {
    throw new Error(
      "user does not have permission to accept booking request for this resource",
    );
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

  if (!resourceRequest) {
    throw new Error("resource request does not exist");
  }

  const isOwner = await resources.isOwner(
    resourceRequest.resourceId,
    meta.author,
  );

  if (!isOwner) {
    throw new Error(
      "author does not have permission to accept a booking request for this resource",
    );
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

  const isOwner = await resources.isOwner(
    resourceRequest.resourceId,
    meta.author,
  );

  if (!isOwner) {
    throw new Error(
      "author does not have permission to accept a booking request for this resource",
    );
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
