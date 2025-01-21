import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { addPromise } from "$lib/promiseMap";

/* (´ヮ´)八(*ﾟ▽ﾟ*)
  *
  * Queries
  * (Read only)
  *
  (ﾉ^ヮ^)ﾉ*:・ﾟ✧ */

export async function getAll(): Promise<Calendar[]> {
  return await db.calendars.toArray();
}

export async function findByInviteCode(code: string): Promise<undefined | Calendar> {
  const calendars = await getAll();
  return calendars.find((calendar) => {
    return inviteCode(calendar) === code;
  });
}

export function inviteCode(calendar: Calendar): string {
  return calendar.id.slice(0, 4);
}

/* ( 'з｀)ﾉ⌒♥*:･。.
  *
  * Commands
  * (Writes / mutates state)
  *
  (ﾉ^ヮ^)ﾉ*:・ﾟ✧ */

export async function create(data: CreateCalendarPayload): Promise<Hash> {
  let hash: Hash = await invoke("create_calendar", {
    payload: {
      type: "calendar_created",
      data,
    },
  });

  // Register this operation in the promise map and wait until it's resolved.
  await addPromise(hash);

  return hash;
}

export async function process(message: ChannelMessage) {
  if (message.event !== "application") {
    return;
  }

  switch (message.data.type) {
    case "calendar_created":
      await db.calendars.add({
        id: message.meta.calendarId,
        ownerId: message.meta.publicKey,
        name: message.data.data.name,
      });
      break;
  }
}
