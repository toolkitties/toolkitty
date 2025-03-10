import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { liveQuery } from "dexie";
import { publicKey } from "./identity";
import { publish, topics } from ".";
import { TopicFactory } from "./topics";

/*
 * Queries
 */

export function findMany(): Promise<Calendar[]> {
  // TODO: check if have access to each calendar and return it alongside calendar
  // TODO: return a livequery
  return db.calendars.toArray();
}

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

/*
 * Commands
 */

export async function create(
  data: CalendarCreated["data"],
): Promise<[OperationId, StreamId]> {
  const myPublicKey = await publicKey();

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
      return await onCalendarUpdated(meta, data);
    case "calendar_deleted":
      return await onCalendarDeleted(meta, data);
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

  let stream = {
    id: meta.stream.id,
    rootHash: meta.stream.rootHash,
    owner: meta.stream.owner,
  };
  await db.streams.add(stream);

  // Add the calendar creator to the list of authors who's data we want to
  // sync for this calendar.
  const topic = new TopicFactory(meta.stream.id);
  await topics.addCalendarAuthor(meta.author, topic.calendarInbox(), {
    stream,
    logPath: publish.CALENDAR_INBOX_LOG_PATH,
  });
  await topics.addCalendarAuthor(meta.author, topic.calendar(), {
    stream,
    logPath: publish.CALENDAR_LOG_PATH,
  });
}

async function onCalendarUpdated(
  meta: StreamMessageMeta,
  data: CalendarUpdated["data"],
) {
  validateFields(data.fields);
  await validateUpdateDelete(meta.author, data.id);

  const calendarId = data.id;
  const { name, dates } = data.fields;
  const timeSpan = dates[0];

  db.transaction("rw", db.calendars, db.events, async () => {
    // Update `validAvailability` field of all events associated with this calendar.
    await db.events
      .where({ calendarId })
      .filter((event) => event.startDate >= timeSpan.end)
      .modify({ validAvailability: false });

    await db.events
      .where({ calendarId })
      .filter((event) => event.endDate <= timeSpan.start)
      .modify({ validAvailability: false });

    // @TODO: also update resources, spaces and booking requests.

    // @TODO: we could show a toast to the user if a previously valid event timespan now became
    // invalid.

    await db.calendars.update(data.id, {
      name,
      startDate: timeSpan.start,
      endDate: timeSpan.end,
    });
  });
}

async function onCalendarDeleted(
  meta: StreamMessageMeta,
  data: CalendarDeleted["data"],
) {
  await validateUpdateDelete(meta.author, data.id);
  const calendarId = data.id;

  db.transaction("rw", db.calendars, db.events, async () => {
    // Update `validAvailability` field of all events associated with this calendar.
    await db.events
      .where({ calendarId })
      .modify({ validAvailability: false });

    // @TODO: we could show a toast to the user if a previously valid event timespan now became
    // invalid.

    await db.calendars.delete(data.id);
  });
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

async function validateUpdateDelete(publicKey: PublicKey, calendarId: Hash) {
  let calendar = await db.calendars.get(calendarId);

  // The calendar must already exist.
  if (!calendar) {
    throw new Error("calendar does not exist");
  }

  // Only the calendar owner can perform updates and deletes.
  if (calendar.ownerId != publicKey) {
    throw new Error("non-owner update or delete on calendar");
  }
}
