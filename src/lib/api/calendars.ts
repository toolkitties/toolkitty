import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { liveQuery } from "dexie";
import { publicKey } from "./identity";
import { topics } from ".";

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
  // Define the "calendar created" application event.
  const payload: CalendarCreated = {
    type: "calendar_created",
    data,
  };

  // Call the "command" on the backend. We receive the hash of the created
  // p2panda operation from the backend. We can use this now as an unique
  // identifier for the application event.
  const hash: Hash = await invoke("create_calendar", { payload });

  // Subscribe to all calendar topics.
  await topics.subscribe(hash, "inbox");
  await topics.subscribe(hash, "data");

  // Add our public key to the topic map on the backend.
  let myPublicKey = await publicKey();
  await topics.addCalendarAuthor(hash, myPublicKey, "inbox");
  await topics.addCalendarAuthor(hash, myPublicKey, "data");

  // Select this calendar.
  await select(hash);

  // Register this operation hash to wait until it's later resolved by the
  // processor. Like this we can conveniently return from this method as soon as
  // this application event has actually been processed. This allows us to build
  // UI where we can for example hide a spinner or redirect the user to another
  // page as soon as the state has changed.
  await promiseResult(hash);

  return hash;
}

export async function update(
  calendar_id: Hash,
  fields: CalendarFields,
): Promise<Hash> {
  let calendar_updated: CalendarUpdated = {
    type: "calendar_updated",
    data: {
      id: calendar_id,
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: calendar_updated,
  });
  return hash;
}

export async function deleteCalendar(calendar_id: Hash): Promise<Hash> {
  let calendar_deleted: CalendarDeleted = {
    type: "calendar_deleted",
    data: {
      id: calendar_id,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: calendar_deleted,
  });
  return hash;
}

/**
 * Select a new calendar. This tells the backend to only forward events
 * associated with the passed calendar to the frontend. Events for any other
 * calendar we are subscribed to will not be processed by the frontend.
 */
export async function select(calendarId: Hash) {
  await setActiveCalendar(calendarId);
  await invoke("select_calendar", { calendarId });
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
  }
}

async function onCalendarCreated(
  meta: StreamMessageMeta,
  data: CalendarCreated["data"],
) {
  // Store calendar in database.
  await db.calendars.add({
    id: meta.calendarId,
    ownerId: meta.publicKey,
    name: data.fields.name,
  });

  // Add the calendar creator to the list of authors who's data we want to
  // sync for this calendar.
  await topics.addCalendarAuthor(meta.calendarId, meta.publicKey, "inbox");
  await topics.addCalendarAuthor(meta.calendarId, meta.publicKey, "data");
}

export async function setActiveCalendar(id: Hash) {
  await db.settings.add({
    name: "activeCalendar",
    value: id,
  });
}
