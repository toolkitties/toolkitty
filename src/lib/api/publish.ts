import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";

export const CALENDAR_LOG_PATH: LogPath = "calendar";
export const CALENDAR_INBOX_LOG_PATH: LogPath = "calendar/inbox";
export const INVITE_TOPIC: string = "invite";
export const CALENDAR_TOPIC_PREFIX: string = "calendar";
export const CALENDAR_INBOX_TOPIC_PREFIX: string = "calendar/inbox";

export async function createCalendar(
  payload: ApplicationEvent,
): Promise<[Hash, Hash]> {
  const [operationId, streamId]: Hash[] = await invoke("publish", {
    payload,
    logPath: CALENDAR_LOG_PATH,
  });

  return [operationId, streamId];
}

export async function toCalendar(
  calendarId: Hash,
  payload: ApplicationEvent,
): Promise<[Hash, Hash]> {
  const calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    throw Error("calendar not found");
  }

  let stream = await db.streams.get(calendarId);

  const [operationId, streamId]: Hash[] = await invoke("publish", {
    payload,
    streamArgs: { rootHash: stream?.rootHash, owner: stream?.owner },
    logPath: CALENDAR_LOG_PATH,
    topic: `${CALENDAR_TOPIC_PREFIX}/${calendarId}`,
  });

  return [operationId, streamId];
}

export async function toInbox(
  calendarId: Hash,
  payload: ApplicationEvent,
): Promise<[Hash, Hash]> {
    const calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    throw Error("calendar not found");
  }

  let stream = await db.streams.get(calendarId);

  const [operationId, streamId]: Hash[] =  await invoke("publish", {
    payload,
    streamArgs: { rootHash: stream?.rootHash, owner: stream?.owner },
    logPath: CALENDAR_INBOX_LOG_PATH,
    topic: `${CALENDAR_INBOX_TOPIC_PREFIX}/${calendarId}`,
  });

  return [operationId, streamId];
}
