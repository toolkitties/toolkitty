import { db } from "$lib/db";
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
    async () => {
      const events: CalendarEventEnriched[] = await db.events
        .where({ calendarId })
        .sortBy("startDate");
      // Add space to each event.
      for (const event of events) {
        if (event.spaceRequest) {
          const request = await db.bookingRequests.get(event.spaceRequest);
          if (!request) {
            continue;
          }
          event.space = await db.spaces.get({ id: request.resourceId });
        }
      }
      return events;
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
      const events: CalendarEventEnriched[] = await db.events
        .where({ ownerId, calendarId })
        .sortBy("startDate");
      for (const event of events) {
        // Add space to each event.
        if (event.spaceRequest) {
          const request = await db.bookingRequests.get(event.spaceRequest);
          if (!request) {
            continue;
          }
          event.space = await db.spaces.get({ id: request.resourceId });
          if (event.space) {
            event.space.bookingRequest = request;
          }
        }

        if (!event.resources) {
          continue;
        }

        // Add resources to each event.
        const resources: CalendarEventResourceEnriched[] = [];
        for (const requestId of event.resources) {
          const request = await db.bookingRequests.get(requestId);
          if (!request) {
            continue;
          }
          const resource: CalendarEventResourceEnriched | undefined =
            await db.resources.get(request.resourceId);
          if (resource) {
            resource.bookingRequest = request;
            resources.push(resource);
          }
        }

        event.resources = resources;
      }
      return events;
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
    async () => {
      const event: CalendarEventEnriched | undefined = await db.events.get({
        id,
      });
      // Add space to event.
      if (event?.spaceRequest) {
        const request = await db.bookingRequests.get(event.spaceRequest);
        if (!request) {
          return event;
        }
        event.space = await db.spaces.get({ id: request.resourceId });
      }
      return event;
    },
  );
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
      return await onEventUpdated(data);
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
      ...data.fields,
    });
  } catch (e) {
    console.error(e);
  }
}

function onEventUpdated(data: EventUpdated["data"]): Promise<void> {
  const eventId = data.id;
  const { endDate, startDate } = data.fields;
  const eventTimeSpan = new TimeSpanClass({ start: startDate, end: endDate });

  return db.transaction("rw", db.events, db.bookingRequests, async () => {
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
