import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";
import { addPromise } from "$lib/promiseMap";

export async function getAll(): Promise<Calendar[]> {
  return await db.calendars.toArray();
}

export async function create(payload: any): Promise<string> {
  let hash: string = await invoke("create_calendar", { payload });

  // Register this operation in the promise map.
  let ready = addPromise(hash);

  // Wait for the promise to be resolved.
  await ready;

  return hash;
}

export async function add(calendar: Calendar): Promise<void> {
  await db.calendars.add(calendar);
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
