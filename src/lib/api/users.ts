/*
 * Queries
 */

import { db } from "$lib/db";
import { identity, users } from ".";

export function findAll(calendarId: CalendarId) {
  return db.users.where({ calendarId }).toArray();
}

// TODO: rename findById and pass in array.
export function get(
  calendarId: CalendarId,
  publicKey: PublicKey,
): Promise<User | undefined> {
  return db.users.get([calendarId, publicKey]);
}

export function create(
  calendarId: CalendarId,
  publicKey: PublicKey,
  userName?: string,
  role?: Role,
) {
  return db.users.add({ calendarId, publicKey, name: userName, role });
}

export async function update(
  calendarId: CalendarId,
  publicKey: PublicKey,
  userName?: string,
  role?: Role,
) {
  const user = await users.get(calendarId, publicKey);

  if (!user) {
    throw new Error("user must exist");
  }

  const myPublicKey = await identity.publicKey();
  if (publicKey != myPublicKey) {
    throw new Error("user does not have permission to update this calendar");
  }

  return db.users.update([calendarId, publicKey], { name: userName, role });
}
