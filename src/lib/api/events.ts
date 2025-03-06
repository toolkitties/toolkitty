// import { events } from '$lib/api/data'

import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { auth, events, publish } from ".";

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
  const amAdmin = await auth.amAdmin(eventId);
  const amOwner = await events.amOwner(eventId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to update this event");
  }

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
  const amAdmin = await auth.amAdmin(eventId);
  const amOwner = await events.amOwner(eventId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to delete this event");
  }

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
  let event = await db.events.get(data.id);

  // The event must already exist.
  if (!event) {
    throw new Error("event does not exist");
  }

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(data.id, meta.author);
  const isOwner = await events.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error("author does not have permission to update this event");
  }

  await db.events.update(data.id, data.fields);
}

async function onEventDeleted(
  meta: StreamMessageMeta,
  data: EventDeleted["data"],
) {
  let event = await db.events.get(data.id);

  // The event must already exist.
  if (!event) {
    throw new Error("event does not exist");
  }

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(data.id, meta.author);
  const isOwner = await events.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error("author does not have permission to delete this event");
  }

  await db.events.delete(data.id);
}