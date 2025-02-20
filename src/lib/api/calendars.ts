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

export async function findMany(): Promise<Calendar[]> {
  return await db.calendars.toArray();
}

export async function findOne(id: Hash): Promise<Calendar | undefined> {
  let calendars = await db.calendars.toArray();
  return calendars.find((calendar) => calendar.id == id);
}

export async function findByInviteCode(
  code: string,
): Promise<undefined | Calendar> {
  const calendars = await findMany();
  return calendars.find((calendar) => {
    return inviteCode(calendar) === code;
  });
}

export function inviteCode(calendar: Calendar): string {
  return calendar.id.slice(0, 4);
}

/*
 * Returns the id of the currently active calendar
 */
export async function getActiveCalendarId() {
  const activeCalendar = await db.settings.get("activeCalendar");
  return activeCalendar?.value;
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
 * Commands
 */

export async function create(data: CalendarCreated["data"]): Promise<Hash> {
  const myPublicKey = await publicKey();

  // Define the "calendar created" application event.
  const calendarCreated: CalendarCreated = {
    type: "calendar_created",
    data,
  };

  const hash = await publish.createCalendar(calendarCreated);

  const topic = new TopicFactory(hash);
  await topics.addCalendarAuthor(
    myPublicKey,
    topic.calendar(),
    publish.CALENDAR_LOG_PATH,
  );
  await topics.subscribe(topic.calendar());
  await topics.addCalendarAuthor(
    myPublicKey,
    topic.calendarInbox(),
    publish.CALENDAR_INBOX_LOG_PATH,
  );
  await topics.subscribe(topic.calendarInbox());

  await invoke("replay", { topic: topic.calendar() });

  // Register this operation hash to wait until it's later resolved by the
  // processor. Like this we can conveniently return from this method as soon as
  // this application event has actually been processed. This allows us to build
  // UI where we can for example hide a spinner or redirect the user to another
  // page as soon as the state has changed.
  await promiseResult(hash);

  return hash;
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

  return await publish.toCalendar(calendarId, calendarUpdated);
}

export async function deleteCalendar(calendarId: Hash): Promise<Hash> {
  const calendarDeleted: CalendarDeleted = {
    type: "calendar_deleted",
    data: {
      id: calendarId,
    },
  };

  return await publish.toCalendar(calendarId, calendarDeleted);
}

export async function setActiveCalendar(id: Hash) {
  await db.settings.add({
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

  let { name, dates } = data.fields;
  let timeSpan = dates[0];

  await db.calendars.add({
    id: meta.stream.id,
    ownerId: meta.stream.owner,
    name,
    startDate: timeSpan.start,
    endDate: timeSpan.end,
  });

  await db.streams.add({
    id: meta.stream.id,
    rootHash: meta.stream.rootHash,
    owner: meta.stream.owner,
  });

  // Add the calendar creator to the list of authors who's data we want to
  // sync for this calendar.
  const topic = new TopicFactory(meta.operationId);
  await topics.addCalendarAuthor(
    meta.author,
    topic.calendarInbox(),
    publish.CALENDAR_INBOX_LOG_PATH,
  );
  await topics.addCalendarAuthor(
    meta.author,
    topic.calendar(),
    publish.CALENDAR_LOG_PATH,
  );
}

async function onCalendarUpdated(
  meta: StreamMessageMeta,
  data: CalendarUpdated["data"],
) {
  validateFields(data.fields);
  await validateUpdateDelete(meta.author, data.id);

  let { name, dates } = data.fields;
  let timeSpan = dates[0];

  await db.calendars.update(data.id, {
    name,
    startDate: timeSpan.start,
    endDate: timeSpan.end,
  });
}

async function onCalendarDeleted(
  meta: StreamMessageMeta,
  data: CalendarDeleted["data"],
) {
  await validateUpdateDelete(meta.author, data.id);
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
