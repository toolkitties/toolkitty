// import { events } from '$lib/api/data'

import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { publish } from ".";
import { getActiveCalendarId } from "./calendars";
import { publicKey } from "./identity";

/**
 * Queries
 */

/**
 * Get events that are associated with the currently active calendar
 */
export async function findMany(): Promise<CalendarEvent[]> {
  return await db.events.toArray();
}

/**
 * Get all events that I am the owner of.
 */
export async function findMine(): Promise<CalendarEvent[]> {
  let myPublicKey = await publicKey();
  let events = (await db.events.toArray()).filter(
    (resource) => resource.ownerId == myPublicKey,
  );
  return events;
}

/**
 * Get one event via its id
 */
export async function findById(id: Hash): Promise<CalendarEvent | undefined> {
  let events = (await db.events.toArray()).filter((events) => events.id == id);

  if (events.length == 0) {
    return;
  }

  return events[0];
}

/**
 * Commands
 */

export async function create(fields: EventFields) {
  const calendarId = await getActiveCalendarId();
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

export async function update(eventId: Hash, fields: EventFields) {
  const calendarId = await getActiveCalendarId();
  let eventUpdated: EventUpdated = {
    type: "event_updated",
    data: {
      id: eventId,
      fields,
    },
  };
  const [operationId, streamId] = await publish.toCalendar(
    calendarId!,
    eventUpdated,
  );

  await promiseResult(operationId);

  return operationId;
}

async function deleteEvent(eventId: Hash) {
  const calendarId = await getActiveCalendarId();
  let eventDeleted: EventDeleted = {
    type: "event_deleted",
    data: {
      id: eventId,
    },
  };
  const [operationId, streamId] = await publish.toCalendar(
    calendarId!,
    eventDeleted,
  );

  await promiseResult(operationId);

  return operationId;
}

//TODO: Move to class so we don't have to export as an alias
export { deleteEvent as delete };

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
