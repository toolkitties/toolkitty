import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { liveQuery } from "dexie";
import { checkHasAccess } from "./access";
import { publicKey } from "./identity";
import { calendars } from ".";

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

  // Also select the calendar. If we didn't do this, then we would never receive the
  // "calendar_created" event on our stream. When we receive the "calendar_selected" event on the
  // stream we then subscribe to all relevant calendar topics.
  await select(hash);

  // Register this operation hash to wait until it's later resolved by the
  // processor. Like this we can conveniently return from this method as soon as
  // this application event has actually been processed. This allows us to build
  // UI where we can for example hide a spinner or redirect the user to another
  // page as soon as the state has changed.
  await promiseResult(hash);

  return hash;
}

/**
 * Select a new calendar. This tells the backend to only forward events
 * associated with the passed calendar to the frontend. Events for any other
 * calendar we are subscribed to will not be processed by the frontend.
 */
export async function select(calendarId: Hash) {
  await invoke("select_calendar", { calendarId });
}

/**
 * Register that we want to sync events from an author for a certain festival. There are two
 * reasons we want to do this:
 *
 * 1) We observe a "CalendarCreated" event for a calendar we're subscribed to and want to add
 *    therefore want to sync events from the calendar creator.
 * 2) We observe a "CalendarAccessAccepted" event for a calendar we're subscribed to and want to
 *    sync events from the newly added author.
 */
export async function addCalendarAuthor(
  calendarId: Hash,
  publicKey: PublicKey,
) {
  await invoke("add_calendar_author", { calendarId, publicKey });
}

/**
 * Subscribe to all possible topics for all calendars we know about.
 *
 * If we don't yet have access to a calendar only the "inbox" topic is subscribed to.
 */
export async function subscribeToAll() {
  let myPublicKey = await publicKey();
  let allMyRequests = (await db.accessRequests.toArray()).filter(
    (request) => request.publicKey == myPublicKey,
  );
  let allMyCalendars = (await db.calendars.toArray()).filter(
    (calendar) => calendar.ownerId == myPublicKey,
  );

  for (const request of allMyRequests) {
    await calendars.subscribe(request.id, "inbox");

    let hasAccess = await checkHasAccess(myPublicKey, request.calendarId);
    if (hasAccess) {
      await calendars.subscribe(request.id, "data");
    }
  }

  for (const request of allMyCalendars) {
    await calendars.subscribe(request.id, "inbox");
    await calendars.subscribe(request.id, "data");
  }
}

/**
 * Subscribe to a calendar. This tells the backend to subscribe to a particular topic type for
 * this calendar, enter gossip overlays and sync with any discovered peers. It does not effect
 * which calendar events are forwarded to the frontend.
 */
export async function subscribe(calendarId: Hash, topicType: TopicType) {
  await invoke("subscribe", { calendarId, topicType });
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
    name: data.fields.calendarName,
    hasAccess: true,
  });

  // Add the calendar creator to the list of authors who's data we want to
  // sync for this calendar.
  await addCalendarAuthor(meta.calendarId, meta.publicKey);
}

export async function setActiveCalendar(id: Hash) {
  await db.settings.add({
    name: "activeCalendar",
    value: id,
  });
}
