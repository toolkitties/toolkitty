import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { bookings, publish, resources, spaces } from ".";

/**
 * Queries
 */

export async function findAllForAuthor(
  calendarId: Hash,
  requester: PublicKey,
): Promise<ResourceRequest[]> {
  return await db.requests
    .where({
      calendarId,
      requester,
    })
    .toArray();
}

export async function findPendingForAuthor(
  calendarId: Hash,
  requester: PublicKey,
): Promise<ResourceRequest[]> {
  const approvals = await db.responses
    .where({ calendarId, answer: "approve" })
    .toArray();

  return await db.requests
    .where({
      calendarId,
      requester,
    })
    .filter((request) => isPending(request, approvals))
    .toArray();
}

export async function findPendingForEvent(
  eventId: Hash,
): Promise<ResourceRequest[]> {
  const approvals = await db.responses
    .where({ eventId, answer: "approve" })
    .toArray();

  const requests = db.requests
    .where({
      eventId,
    })
    .filter((request) => isPending(request, approvals))
    .toArray();

  return requests;
}

function isPending(
  request: ResourceRequest,
  approvals: ResourceResponse[],
): boolean {
  return (
    approvals.find((response) => {
      return response.requestId == request.id;
    }) == undefined
  );
}

/**
 * Get one request by its ID
 */
export async function findById(id: Hash): Promise<ResourceRequest | undefined> {
  //TODO: Return events from db

  // return test data.
  return;
}

export async function request(
  eventId: Hash,
  resourceId: Hash,
  type: ResourceType,
  message: string,
  timeSpan: TimeSpan,
) {
  let event = await db.events.get(eventId);
  const resourceRequested: ResourceRequested = {
    type: "resource_requested",
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

export async function accept(requestId: Hash) {
  let bookingRequest = await db.requests.get(requestId);
  const bookingRequested: ResourceRequestAccepted = {
    type: "resource_request_accepted",
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

export async function reject(requestId: Hash) {
  let bookingRequest = await db.requests.get(requestId);
  const bookingRequested: ResourceRequestRejected = {
    type: "resource_request_rejected",
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
    case "resource_requested":
      return await onResourceRequested(meta, data);
    case "resource_request_accepted":
      return await onResourceRequestAccepted(meta, data);
    case "resource_request_rejected":
      return await onResourceRequestRejected(meta, data);
  }
}

async function onResourceRequested(
  meta: StreamMessageMeta,
  data: ResourceRequested["data"],
) {
  const resourceRequest: ResourceRequest = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    eventId: data.eventId,
    requester: meta.author,
    resourceId: data.resourceId,
    resourceType: data.type,
    message: data.message,
    timeSpan: data.timeSpan,
  };
  await db.requests.add(resourceRequest);
}

async function onResourceRequestAccepted(
  meta: StreamMessageMeta,
  data: ResourceRequestAccepted["data"],
) {
  const resourceRequest = await db.requests.get(data.requestId);

  if (!resourceRequest) {
    throw new Error("resource request does not exist");
  }

  const resourceResponse: ResourceResponse = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    eventId: resourceRequest.eventId,
    responder: meta.author,
    requestId: data.requestId,
    answer: "approve",
  };
  await db.responses.add(resourceResponse);
}

async function onResourceRequestRejected(
  meta: StreamMessageMeta,
  data: ResourceRequestRejected["data"],
) {
  const resourceRequest = await db.requests.get(data.requestId);

  if (!resourceRequest) {
    throw new Error("resource request does not exist");
  }

  const resourceResponse: ResourceResponse = {
    id: meta.operationId,
    calendarId: meta.stream.id,
    eventId: resourceRequest.eventId,
    responder: meta.author,
    requestId: data.requestId,
    answer: "reject",
  };
  await db.responses.add(resourceResponse);
}
