// import { events } from '$lib/api/data'

import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { isSubTimespan } from "$lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { auth, events, publish, roles } from ".";
import { TopicFactory } from "./topics";

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
  const event = await events.findById(eventId);

  const amAdmin = await auth.amAdmin(event!.calendarId);
  const amOwner = await events.amOwner(eventId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to update this event");
  }

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

  const amAdmin = await auth.amAdmin(event!.calendarId);
  const amOwner = await events.amOwner(eventId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to delete this event");
  }

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
      return await onEventUpdated(data);
    case "event_deleted":
      return await onEventDeleted(data);
  }
}

function onEventCreated(
  meta: StreamMessageMeta,
  data: EventCreated["data"],
): Promise<string> {
  return db.events.add({
    id: meta.operationId,
    calendarId: meta.stream.id,
    ownerId: meta.stream.owner,
    ...data.fields,
  });
}

function onEventUpdated(data: EventUpdated["data"]): Promise<void> {
  const eventId = data.id;
  const { endDate, startDate } = data.fields;

  return db.transaction("rw", db.events, db.bookingRequests, async () => {
    // Update `validTime` field of all booking requests associated with this event.
    await db.bookingRequests.where({ eventId }).modify((request) => {
      const isValid = isSubTimespan(startDate, endDate, request.timeSpan);
      request.isValid = isValid ? "true" : "false";
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
