import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";

/*
 * Queries
 */

export async function getAll(): Promise<Calendar[]> {
  return await db.calendars.toArray();
}

export async function findByInviteCode(
  code: string,
): Promise<undefined | Calendar> {
  const calendars = await getAll();
  return calendars.find((calendar) => {
    return inviteCode(calendar) === code;
  });
}

export function inviteCode(calendar: Calendar): string {
  return calendar.id.slice(0, 4);
}

/*
 * Commands
 */

export async function create(
  data: CalendarCreatedEvent["data"],
): Promise<Hash> {
  // Define the "calendar created" application event.
  //
  // @TODO: Currently subscribing and selecting the calendar occurs on the
  // backend when this method is called. It would be more transparent, avoiding
  // hidden side-effects, if this could happen on the frontend with follow-up
  // IPC calls. This can be refactored when
  // https://github.com/toolkitties/toolkitty/issues/69 is implemented.
  const payload: CalendarCreatedEvent = {
    type: "calendar_created",
    data,
  };

  // Call the "command" on the backend. We receive the hash of the created
  // p2panda operation from the backend. We can use this now as an unique
  // identifier for the application event.
  const hash: Hash = await invoke("create_calendar", { payload });

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
export async function subscribe(calendarId: Hash) {
  await invoke("subscribe_to_calendar", { calendarId });
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
  data: CalendarCreatedEvent["data"],
) {
  await db.calendars.add({
    id: meta.calendarId,
    ownerId: meta.publicKey,
    name: data.name,
  });
}
