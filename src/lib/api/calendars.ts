import { db } from "$lib/db";

export async function getAll(): Promise<Calendar[]> {
  return await db.calendars.toArray();
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
