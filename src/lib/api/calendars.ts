import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { liveQuery } from "dexie";
import {
  access,
  auth,
  calendars,
  identity,
  publish,
  roles,
  streams,
  topics,
  users,
} from ".";
import { TopicFactory } from "./topics";

/*
 * Queries
 */

export function findMany(): Promise<Calendar[]> {
  // TODO: check if have access to each calendar and return it alongside calendar
  // TODO: return a livequery
  return db.calendars.toArray();
}

// @TODO: for consistency this query should be named `findById`
export function findOne(id: Hash): Promise<Calendar | undefined> {
  return db.calendars.get({ id });
}

export function findByInviteCode(code: string): Promise<undefined | Calendar> {
  return db.calendars
    .filter((calendar) => inviteCode(calendar) === code.toLowerCase())
    .first();
}

export function inviteCode(calendar: Calendar): string {
  return calendar.id.slice(0, 4);
}

/*
 * Returns the id of the currently active calendar
 */
export function getActiveCalendarId(): Promise<string | undefined> {
  return db.settings
    .get("activeCalendar")
    .then((activeCalendar) => activeCalendar?.value);
}

/*
 * Observable for watching the name of the currently active calendar
 */
export const getActiveCalendar = liveQuery(async () => {
  const activeCalendarId = await db.settings.get("activeCalendar");
  if (!activeCalendarId) return;
  const activeCalendar = await db.calendars.get(activeCalendarId.value);
  return activeCalendar?.name;
});

/*
 * Share code for currently active calendar
 */
export async function getShareCode() {
  const activeCalendarId = await db.settings.get("activeCalendar");
  if (!activeCalendarId) return "";
  return activeCalendarId.value.slice(0, 4);
}

export async function isOwner(
  calendarId: Hash,
  publicKey: PublicKey,
): Promise<boolean> {
  return auth.isOwner(calendarId, publicKey, "calendar");
}

export async function amOwner(calendarId: Hash): Promise<boolean> {
  return auth.amOwner(calendarId, "calendar");
}

/*
 * Commands
 */

export async function create(
  data: CalendarCreated["data"],
): Promise<[OperationId, StreamId]> {
  // Define the "calendar created" application event.
  const calendarCreated: CalendarCreated = {
    type: "calendar_created",
    data,
  };

  const [operationId, streamId] = await publish.createCalendar(calendarCreated);
  const topic = new TopicFactory(streamId);
  await topics.subscribe(topic.calendar());
  await topics.subscribe(topic.calendarInbox());

  await invoke("replay", { topic: topic.calendar() });

  // Register this operation hash to wait until it's later resolved by the
  // processor. Like this we can conveniently return from this method as soon as
  // this application event has actually been processed. This allows us to build
  // UI where we can for example hide a spinner or redirect the user to another
  // page as soon as the state has changed.
  await promiseResult(operationId);

  return [operationId, streamId];
}

export async function update(
  calendarId: Hash,
  fields: CalendarFields,
): Promise<Hash> {
  const amAdmin = await auth.amAdmin(calendarId);
  const amOwner = await calendars.amOwner(calendarId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to update this calendar");
  }

  let calendarUpdated: CalendarUpdated = {
    type: "calendar_updated",
    data: {
      id: calendarId,
      fields,
    },
  };

  const [operationId, streamId] = await publish.toCalendar(
    calendarId,
    calendarUpdated,
  );

  await promiseResult(operationId);

  return operationId;
}

export async function deleteCalendar(calendarId: Hash): Promise<Hash> {
  const amAdmin = await auth.amAdmin(calendarId);
  const amOwner = await calendars.amOwner(calendarId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to delete this calendar");
  }

  const calendarDeleted: CalendarDeleted = {
    type: "calendar_deleted",
    data: {
      id: calendarId,
    },
  };

  const [operationId, streamId] = await publish.toCalendar(
    calendarId,
    calendarDeleted,
  );

  await promiseResult(operationId);

  return operationId;
}

export async function setActiveCalendar(id: Hash) {
  await db.settings.put({
    name: "activeCalendar",
    value: id,
  });
}

/*
 * Processor
 */

export async function process(message: ApplicationMessage) {
  const meta = message.meta;
  const { data, type } = message.data;

  switch (type) {
    case "calendar_created":
      return await onCalendarCreated(meta, data);
    case "calendar_updated":
      return await onCalendarUpdated(data);
    case "calendar_deleted":
      return await onCalendarDeleted(data);
  }
}

async function onCalendarCreated(
  meta: StreamMessageMeta,
  data: CalendarCreated["data"],
) {
  validateFields(data.fields);

  // @TODO(sam): validate that header hash and owner match those contained in stream.

  let { name, dates } = data.fields;
  let timeSpan = dates[0];

  await db.calendars.add({
    id: meta.stream.id,
    ownerId: meta.stream.owner,
    name,
    startDate: timeSpan.start,
    endDate: timeSpan.end,
  });

  // If we were the creator of this calendar then add it as a new stream to the streams table as
  // well. In the case of calendars that we join (via requesting access) the stream is added to
  // the database on the "calendar_access_accepted" message.
  const myPublicKey = await identity.publicKey();
  if (meta.author === myPublicKey) {
    await streams.add(meta.stream);
  }

  // @TODO: the calendar creator has no way to set a username.
  await users.create(meta.stream.id, meta.stream.owner);

  // Add the calendar creator to the list of authors who's data we want to
  // sync for this calendar.
  access.processNewCalendarAuthor(meta.stream.id, meta.stream.owner);

  // Replay un-ack'd messages which we may have received out-of-order.
  const topic = new TopicFactory(meta.stream.id);
  await invoke("replay", { topic: topic.calendar() });
}

async function onCalendarUpdated(data: CalendarUpdated["data"]) {
  // @TODO: move validation into own "validation" processor module (and maybe we don't want to
  // actually error here anyway?)
  validateFields(data.fields);

  const { name, dates } = data.fields;
  const timeSpan = dates[0];

  await db.calendars.update(data.id, {
    name,
    startDate: timeSpan.start,
    endDate: timeSpan.end,
  });

}

async function onCalendarDeleted(data: CalendarDeleted["data"]) {
  await db.calendars.delete(data.id);
}

/**
 * Validation
 */

function validateFields(fields: CalendarFields) {
  let { dates } = fields;
  if (dates.length == 0) {
    throw new Error("calendar dates must contain at least on time span");
  }
}
