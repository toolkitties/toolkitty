import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { liveQuery } from "dexie";
import { auth, calendars, identity, publish, users } from ".";

/*
 * Queries
 */

export function findMany(): Promise<Calendar[]> {
  // TODO: check if have access to each calendar and return it alongside calendar
  // TODO: return a livequery
  return db.calendars.toArray();
}

// @TODO: for consistency this query should be named `findById`
export function findById(id: Hash): Promise<Calendar | undefined> {
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

  const calendarUpdated: CalendarUpdated = {
    type: "calendar_updated",
    data: {
      id: calendarId,
      fields,
    },
  };

  const [operationId] = await publish.toCalendar(calendarId, calendarUpdated);

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

  const [operationId] = await publish.toCalendar(calendarId, calendarDeleted);

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

  const { name, dates, calendarInstructions, spacePageText, resourcePageText } = data.fields;
  const timeSpan = dates[0];

  const myPublicKey = await identity.publicKey();

  // We need to distinguish between the case where we (the local user) created the calendar, or
  // where we have requested and gained access as a new member.
  if (meta.stream.owner == myPublicKey) {
    // In the case that we created this calendar then simply add it straight to the database.
    try {
      await db.calendars.add({
        id: meta.stream.id,
        ownerId: meta.stream.owner,
        stream: meta.stream,
        name,
        startDate: timeSpan.start,
        endDate: timeSpan.end,
        calendarInstructions: calendarInstructions ? calendarInstructions : undefined,
        spacePageText: spacePageText ? spacePageText : undefined,
        resourcePageText: resourcePageText ? resourcePageText : undefined
      });
    } catch (e) {
      console.error(e);
    }

    // And then create our user for the calendar.
    //
    // @TODO: currently there is no UI for the calendar owner to create a username.
    const user = await users.get(meta.stream.id, myPublicKey);
    if (!user) {
      await users.create(meta.stream.id, myPublicKey);
    }
  } else {
    // In the case where we are _not_ the calendar creator, then we actually should have already
    // added the calendar and our user to the database when we first resolved our invite code.
    await db.calendars.update(meta.stream.id, {
      name,
      startDate: timeSpan.start,
      endDate: timeSpan.end,
      calendarInstructions: calendarInstructions ? calendarInstructions : undefined,
      spacePageText: spacePageText ? spacePageText : undefined,
      resourcePageText: resourcePageText ? resourcePageText : undefined
    });
  }
}

async function onCalendarUpdated(data: CalendarUpdated["data"]) {
  // @TODO: move validation into own "validation" processor module (and maybe we don't want to
  // actually error here anyway?)
  validateFields(data.fields);

  const { name, dates, calendarInstructions, spacePageText, resourcePageText } = data.fields;
  const timeSpan = dates[0];

  await db.calendars.update(data.id, {
    name,
    startDate: timeSpan.start,
    endDate: timeSpan.end,
    calendarInstructions: calendarInstructions ? calendarInstructions : undefined,
    spacePageText: spacePageText ? spacePageText : undefined,
    resourcePageText: resourcePageText ? resourcePageText : undefined
  });
}

async function onCalendarDeleted(data: CalendarDeleted["data"]) {
  await db.calendars.delete(data.id);
}

/**
 * Validation
 */

function validateFields(fields: CalendarFields) {
  const { dates } = fields;
  if (dates.length == 0) {
    throw new Error("calendar dates must contain at least on time span");
  }
}
