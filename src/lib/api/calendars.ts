import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { liveQuery } from "dexie";
import { addCalendarAuthor } from "./access";

/*
 * Queries
 */

export async function findMany(): Promise<Calendar[]> {
  return await db.calendars.toArray();
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
  //
  // @TODO: Currently subscribing and selecting the calendar occurs on the
  // backend when this method is called. It would be more transparent, avoiding
  // hidden side-effects, if this could happen on the frontend with follow-up
  // IPC calls. This can be refactored when
  // https://github.com/toolkitties/toolkitty/issues/69 is implemented.
  const payload: CalendarCreated = {
    type: "calendar_created",
    data,
  };

  // Call the "command" on the backend. We receive the hash of the created
  // p2panda operation from the backend. We can use this now as an unique
  // identifier for the application event.
  const hash: Hash = await invoke("create_calendar", { payload });

  // The above command created a calendar on the local node, but we also want to subscribe to it
  // as a topic on the network in order to discover and sync with other interested peers.
  await subscribe(hash, "inbox");
  await subscribe(hash, "data");

  // Also select the calendar.
  //
  // @TODO(sam): do we want this to happen here or in a manual step?
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
 * Subscribe to a calendar. This tells the backend to subscribe to all topics
 * associated with this calendar, enter gossip overlays and sync with any
 * discovered peers. It does not effect which calendar events are forwarded to
 * the frontend.
 */
export async function subscribe(
  calendarId: Hash,
  subscriptionType: SubscriptionType,
) {
  await invoke("subscribe", { calendarId, subscriptionType });
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
  });

  // Add the calendar creator to the list of authors who's data we want to
  // sync for this calendar.
  await addCalendarAuthor(meta.calendarId, meta.publicKey);

  // Set this as the active calendar.
  await setActiveCalendar(meta.calendarId);
}

async function setActiveCalendar(id: Hash) {
  await db.settings.add({
    name: "activeCalendar",
    value: id,
  });
}
