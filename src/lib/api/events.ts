// import { events } from '$lib/api/data'

import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { events, publish } from ".";

/**
 * Queries
 */

/**
 * Get events that are associated with the passed calendar
 */
export function findMany(calendarId: Hash): Promise<CalendarEvent[]> {
  return db.events.where({ calendarId }).toArray();
}

/**
 * Get all calendar events owned by the passed public key.
 */
export function findByOwner(
  calendarId: Hash,
  ownerId: PublicKey,
): Promise<CalendarEvent[]> {
  return db.events.where({ ownerId, calendarId }).toArray();
}

/**
 * Get one event via its id
 */
export function findById(id: Hash): Promise<CalendarEvent | undefined> {
  return db.events.get({ id });
}

/**
 * Commands
 */

/**
 * Create a calendar event.
 */
export async function create(calendarId: Hash, fields: EventFields) {
  let eventCreated: EventCreated = {
    type: "event_created",
    data: {
      fields,
    },
  };
  const [operationId, streamId] = await publish.toCalendar(
    calendarId!,
    eventCreated,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Update a calendar event.
 */
export async function update(eventId: Hash, fields: EventFields) {
  const event = await events.findById(eventId);
  let eventUpdated: EventUpdated = {
    type: "event_updated",
    data: {
      id: eventId,
      fields,
    },
  };
  const [operationId, streamId] = await publish.toCalendar(
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
  let eventDeleted: EventDeleted = {
    type: "event_deleted",
    data: {
      id: eventId,
    },
  };
  const [operationId, streamId] = await publish.toCalendar(
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
      return await onEventDeleted(meta, data);
  }
}

async function onEventCreated(
  meta: StreamMessageMeta,
  data: EventCreated["data"],
) {
  let { name, description, startDate, endDate, resources, links, images } =
    data.fields;

  await db.events.add({
    id: meta.operationId,
    name,
    calendarId: meta.stream.id,
    ownerId: meta.stream.owner,
    description,
    startDate,
    endDate,
    resources,
    links,
    images,
  });
}

async function onEventUpdated(
  meta: StreamMessageMeta,
  data: EventUpdated["data"],
) {
  await validateUpdateDelete(meta.author, data.id);

  let { name, description, startDate, endDate, resources, links, images } =
    data.fields;

  await db.events.update(data.id, {
    name,
    calendarId: meta.stream.id,
    ownerId: meta.stream.owner,
    description,
    startDate,
    endDate,
    resources,
    links,
    images,
  });
}

async function onEventDeleted(
  meta: StreamMessageMeta,
  data: EventDeleted["data"],
) {
  await validateUpdateDelete(meta.author, data.id);
  await db.events.delete(data.id);
}

/**
 * Validation
 */

async function validateUpdateDelete(publicKey: PublicKey, resourceId: Hash) {
  let resource = await db.events.get(resourceId);

  // The resource must already exist.
  if (!resource) {
    throw new Error("resource does not exist");
  }

  // Only the resource owner can perform updates and deletes.
  if (resource.ownerId != publicKey) {
    throw new Error("non-owner update or delete on resource");
  }
}
