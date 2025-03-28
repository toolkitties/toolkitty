import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { toast } from "$lib/toast.svelte";
import { publish, identity, spaces, resources, bookings } from ".";
import { TimeSpanClass } from "$lib/timeSpan";
/**
 * Queries
 */

export function findById(
  requestId: Hash,
): Promise<BookingRequestEnriched | undefined> {
  return db.transaction(
    "r",
    db.bookingRequests,
    db.resources,
    db.spaces,
    db.events,
    async () => {
      const bookingRequest: BookingRequestEnriched | undefined =
        await db.bookingRequests.get(requestId);
      if (!bookingRequest) {
        return;
      }

      // Add resource or space to booking.
      if (bookingRequest.resourceType == "space") {
        bookingRequest.space = await db.spaces.get(bookingRequest.resourceId);
      } else {
        bookingRequest.resource = await db.resources.get(
          bookingRequest.resourceId,
        );
      }

      // Add event to booking.
      bookingRequest.event = await db.events.get(bookingRequest.eventId);

      return bookingRequest;
    },
  );
}

/**
 * Search the database for any booking requests matching the passed filter object.
 */
export function findAll(
  bookingQueryFilter: BookingQueryFilter = {},
): Promise<BookingRequestEnriched[]> {
  const { from, to, ...filter } = bookingQueryFilter;
  return db.transaction(
    "r",
    db.bookingRequests,
    db.resources,
    db.spaces,
    db.events,
    async () => {
      const query = db.bookingRequests.where(filter);

      if (from) {
        query.filter((request) => {
          const timeSpan = new TimeSpanClass(request.timeSpan);
          return timeSpan.startDate() >= from;
        });
      }

      if (to) {
        query.filter((request) => {
          const timeSpan = new TimeSpanClass(request.timeSpan);
          return timeSpan.startDate() <= to;
        });
      }

      const bookingRequests: BookingRequestEnriched[] = await query.toArray();

      for (const bookingRequest of bookingRequests) {
        // Add resource or space to booking.
        if (bookingRequest.resourceType == "space") {
          bookingRequest.space = await db.spaces.get(bookingRequest.resourceId);
        } else {
          bookingRequest.resource = await db.resources.get(
            bookingRequest.resourceId,
          );
        }

        // Add event to booking.
        bookingRequest.event = await db.events.get(bookingRequest.eventId);
      }

      return bookingRequests;
    },
  );
}

/**
 * Search the database for any pending booking requests matching the passed filter object.
 */
export function findPending(
  calendarId: Hash,
): Promise<BookingRequestEnriched[]> {
  return bookings.findAll({ calendarId, status: "pending" });
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
  const event = await db.events.get(eventId);
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

  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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
  const bookingRequest = await db.bookingRequests.get(requestId);
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

  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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
  const bookingRequest = await db.bookingRequests.get(requestId);

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

  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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
): Promise<void> {
  const request = await db.bookingRequests.get(meta.operationId);
  if (request) {
    return;
  }

  await db.transaction(
    "rw",
    db.bookingRequests,
    db.bookingResponses,
    db.resources,
    db.spaces,
    async () => {
      let resource;
      if (data.type == "resource") {
        resource = await db.resources.get(data.resourceId);
      } else {
        resource = await db.spaces.get(data.resourceId);
      }

      const resourceAvailability = resource!.availability;

      const resourceRequest: BookingRequest = {
        id: meta.operationId,
        calendarId: meta.stream.id,
        requester: meta.author,
        resourceType: data.type,
        resourceOwner: resource!.ownerId,
        isValid: "false",
        status: "pending",
        createdAt: meta.timestamp,
        ...data,
      };

      if (resourceAvailability == "always") {
        resourceRequest.isValid = "true";
      } else {
        for (const span of resourceAvailability) {
          const availabilityTimeSpan = new TimeSpanClass(span);
          const requestTimeSpan = new TimeSpanClass(resourceRequest.timeSpan);
          const isSub = availabilityTimeSpan.contains(requestTimeSpan);
          if (isSub) {
            resourceRequest.isValid = "true";
          }
        }
      }

      const acceptResponses = await db.bookingResponses
        .where({ requestId: meta.operationId, answer: "accept" })
        .toArray();
      const rejectResponses = await db.bookingResponses
        .where({ requestId: meta.operationId, answer: "reject" })
        .toArray();

      if (acceptResponses.length > 0 && rejectResponses.length == 0) {
        resourceRequest.status = "accepted";
      }

      await db.bookingRequests.add(resourceRequest);
    },
  );

  const publicKey = await identity.publicKey();
  let resource;
  if (data.type == "resource") {
    resource = await db.resources.get(data.resourceId);
  } else {
    resource = await db.spaces.get(data.resourceId);
  }

  // Check if we own the resource, otherwise do nothing
  if (resource?.ownerId == publicKey) {
    if (meta.author == publicKey) {
      // Automatically accept resource if we are the owner and we make the request
      await accept(meta.operationId);
    } else {
      // Show toast if we are the owner of the resource and we didn't make the request.
      const resourceRequest = await bookings.findById(meta.operationId);
      toast.bookingRequest(resourceRequest!);
    }
  }
}

async function onBookingRequestAccepted(
  meta: StreamMessageMeta,
  data: BookingRequestAccepted["data"],
): Promise<void> {
  const response = await db.bookingResponses.get(meta.operationId);
  if (response) {
    return;
  }

  return db.transaction(
    "rw",
    db.bookingRequests,
    db.bookingResponses,
    async () => {
      const resourceRequest = await db.bookingRequests.get(data.requestId);
      const resourceResponse: BookingResponse = {
        id: meta.operationId,
        calendarId: meta.stream.id,
        eventId: resourceRequest!.eventId,
        responder: meta.author,
        requestId: data.requestId,
        answer: "accept",
      };

      // Only update the resource request to `accepted` if the previous value was `pending`.
      // Already rejected requests cannot be later accepted.
      if (resourceRequest!.status == "pending") {
        await db.bookingRequests.update(data.requestId, { status: "accepted" });
      }
      await db.bookingResponses.add(resourceResponse);
    },
  );
}

async function onBookingRequestRejected(
  meta: StreamMessageMeta,
  data: BookingRequestRejected["data"],
): Promise<void> {
  const response = await db.bookingResponses.get(meta.operationId);
  if (response) {
    return;
  }

  return db.transaction(
    "rw",
    db.bookingRequests,
    db.bookingResponses,
    async () => {
      const resourceRequest = await db.bookingRequests.get(data.requestId);
      const resourceResponse: BookingResponse = {
        id: meta.operationId,
        calendarId: meta.stream.id,
        eventId: resourceRequest!.eventId,
        responder: meta.author,
        requestId: data.requestId,
        answer: "reject",
      };

      await db.bookingRequests.update(data.requestId, { status: "rejected" });
      await db.bookingResponses.add(resourceResponse);
    },
  );
}
