import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";

/*
 * Queries
 *
 * Queries only return information about the local application state in a
 * read-only manner, usually by asking the database or backend.
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
 *
 * Commands are called from the UI or middleware. They create one or more
 * "application events" which get published on the p2p network, ready to be
 * processed by us and other peers.
 *
 * Application events we've created ourselves get processed by the backend
 * stream processor, forwarded to the frontend where they are further processed
 * (and finally acknowledged as "completed").
 *
 * Calling a command, creating the event does _not_ cause any state changes
 * yet. At this stage we simply announced our "intent" that we want to change
 * something on the network. The actual state change happens during processing,
 * see further below.
 */

export async function create(
  data: CalendarCreatedEvent["data"],
): Promise<Hash> {
  // Define the "calendar created" application event.
  //
  // @TODO: Currently subscribing and selecting the calendar occurs on the backend when this
  // method is called. It would be more transparent, avoiding hidden side-effects, if this could
  // happen on the frontend with follow-up IPC calls. This can be refactored when
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

/*
 * Processor
 *
 * Application events from us or other peers eventually arrive in our stream
 * processor where we finally change our state based on the given event.
 *
 * The processor gets called whenever an event arrives, which is through the
 * channel.
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

// @TODO: move to own module and add doc string
export async function select(calendarId: Hash) {
  await invoke("select_calendar", { calendarId });
}

// @TODO: move to own module and add doc string
export async function subscribe(calendarId: Hash) {
  await invoke("subscribe_to_calendar", { calendarId });
}
