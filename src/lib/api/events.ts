import { db } from "$lib/db";
import { shouldUpdate } from "$lib/lww";
import { promiseResult } from "$lib/promiseMap";
import { TimeSpanClass } from "$lib/timeSpan";
import { auth, events, publish } from ".";

/**
 * Queries
 */

/**
 * Get events that are associated with the passed calendar
 */
export function findMany(calendarId: Hash): Promise<CalendarEventEnriched[]> {
  return db.transaction(
    "r",
    db.events,
    db.bookingRequests,
    db.spaces,
    db.resources,
    async () => {
      const events: CalendarEvent[] = await db.events
        .where({ calendarId })
        .sortBy("startDate");

      const eventsEnriched = [];
      for (const event of events) {
        const eventEnriched = await enrichEvent(event);
        eventsEnriched.push(eventEnriched);
      }
      return eventsEnriched;
    },
  );
}

/**
 * Get all calendar events owned by the passed public key.
 */
export function findByOwner(
  calendarId: Hash,
  ownerId: PublicKey,
): Promise<CalendarEventEnriched[]> {
  return db.transaction(
    "r",
    db.events,
    db.bookingRequests,
    db.resources,
    db.spaces,
    async () => {
      const events: CalendarEvent[] = await db.events
        .where({ ownerId, calendarId })
        .sortBy("startDate");

      const eventsEnriched = [];
      for (const event of events) {
        const eventEnriched = await enrichEvent(event);
        eventsEnriched.push(eventEnriched);
      }
      return eventsEnriched;
    },
  );
}

/**
 * Get one event via its id
 */
export function findById(id: Hash): Promise<CalendarEventEnriched | undefined> {
  return db.transaction(
    "r",
    db.events,
    db.bookingRequests,
    db.spaces,
    db.resources,
    async () => {
      const event = await db.events.get({
        id,
      });

      if (!event) {
        return;
      }

      return await enrichEvent(event);
    },
  );
}

async function enrichEvent(
  event: CalendarEvent,
): Promise<CalendarEventEnriched> {
  // Add space booking request to event.
  const eventEnriched = event as CalendarEventEnriched;
  const spaceRequests = await db.bookingRequests
    .where({ eventId: event.id, resourceType: "space", isValid: "true" })
    .sortBy("createdAt");
  if (spaceRequests.length === 0) {
    return eventEnriched;
  }
  eventEnriched.spaceRequest = spaceRequests[0];

  // If the booking request is accepted add the space to the event as well.
  if (spaceRequests[0].status == "accepted") {
    eventEnriched.space = await db.spaces.get({
      id: spaceRequests[0].resourceId,
    });
  }

  // Add resource requests to event.
  const resourceRequests = await db.bookingRequests
    .where({ eventId: event.id, resourceType: "resource", isValid: "true" })
    .sortBy("createdAt");
  eventEnriched.resourceRequests = resourceRequests;

  // Add any accepted resources to the event as well.
  const resources = [];
  for (const request of resourceRequests) {
    if (request.status == "accepted") {
      const resource = await db.resources.get({
        id: request.resourceId,
      });

      if (resource) {
        resources.push(resource);
      }
    }
  }
  eventEnriched.resources = resources;

  return eventEnriched;
}

export async function isOwner(
  eventId: Hash,
  publicKey: PublicKey,
): Promise<boolean> {
  return auth.isOwner(eventId, publicKey, "event");
}

export async function amOwner(eventId: Hash): Promise<boolean> {
  return auth.amOwner(eventId, "event");
}

/**
 * Commands
 */

/**
 * Create a calendar event.
 */
export async function create(calendarId: Hash, fields: EventFields) {
  const eventCreated: EventCreated = {
    type: "event_created",
    data: {
      fields,
    },
  };
  const [operationId] = await publish.toCalendar(calendarId!, eventCreated);

  await promiseResult(operationId);

  return operationId;
}

/**
 * Update a calendar event.
 */
export async function update(eventId: Hash, fields: EventFields) {
  const event = await events.findById(eventId);

  const amAdmin = await auth.amAdmin(event!.calendarId);
  const amOwner = await events.amOwner(eventId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to update this event");
  }

  const eventUpdated: EventUpdated = {
    type: "event_updated",
    data: {
      id: eventId,
      fields,
    },
  };
  const [operationId] = await publish.toCalendar(
    event!.calendarId,
    eventUpdated,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Delete a calendar event.
 */
async function deleteEvent(eventId: Hash) {
  const event = await events.findById(eventId);

  const amAdmin = await auth.amAdmin(event!.calendarId);
  const amOwner = await events.amOwner(eventId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to delete this event");
  }

  const eventDeleted: EventDeleted = {
    type: "event_deleted",
    data: {
      id: eventId,
    },
  };
  const [operationId] = await publish.toCalendar(
    event!.calendarId,
    eventDeleted,
  );

  await promiseResult(operationId);

  return operationId;
}

//TODO: Move to class so we don't have to export as an alias
export { deleteEvent as delete };

/**
 * Processors
 */

export async function process(message: ApplicationMessage) {
  const meta = message.meta;
  const { data, type } = message.data;

  switch (type) {
    case "event_created":
      return await onEventCreated(meta, data);
    case "event_updated":
      return await onEventUpdated(meta, data);
    case "event_deleted":
      return await onEventDeleted(data);
  }
}

async function onEventCreated(
  meta: StreamMessageMeta,
  data: EventCreated["data"],
): Promise<void> {
  try {
    await db.events.add({
      id: meta.operationId,
      calendarId: meta.stream.id,
      ownerId: meta.author,
      createdAt: meta.timestamp,
      updatedAt: meta.timestamp,
      ...data.fields,
    });
  } catch (e) {
    // In case we try to add the event twice log the error.
    console.error(e);
  }
}

function onEventUpdated(
  meta: StreamMessageMeta,
  data: EventUpdated["data"],
): Promise<void> {
  const eventId = data.id;
  const { endDate, startDate } = data.fields;
  const eventTimeSpan = new TimeSpanClass({ start: startDate, end: endDate });

  return db.transaction("rw", db.events, db.bookingRequests, async () => {
    const event = await db.events.get(data.id);
    if (!event) {
      // The event may have been deleted.
      return;
    }

    // Updates should only be applied if they have a greater timestamp or in the case of timestamp
    // equality, the hash is greater.
    if (
      !shouldUpdate(event.updatedAt, event.id, meta.timestamp, meta.operationId)
    ) {
      return;
    }

    // Update `validTime` field of all booking requests associated with this event.
    await db.bookingRequests.where({ eventId }).modify((request) => {
      const requestTimeSpan = new TimeSpanClass(request.timeSpan);
      const isSub = eventTimeSpan.contains(requestTimeSpan);
      request.isValid = isSub ? "true" : "false";
    });

    // @TODO: we could show a toast to the user if a previously valid event timespan now became
    // invalid.

    await db.events.update(data.id, {
      ...data.fields,
      updatedAt: meta.timestamp,
    });
  });
}

function onEventDeleted(data: EventDeleted["data"]): Promise<void> {
  const eventId = data.id;

  return db.transaction("rw", db.events, db.bookingRequests, async () => {
    // Update `validTime` field of all booking requests associated with this space.
    await db.bookingRequests.where({ eventId }).modify({ isValid: "false" });

    // @TODO: we could show a toast to the user if a previously valid space timespan now became
    // invalid.

    await db.events.delete(data.id);
  });
}
