/*
 * Queries
 */

import { promiseResult } from "$lib/promiseMap";
import {
  auth,
  calendars,
  events,
  identity,
  publish,
  resources,
  spaces,
  users,
} from ".";

type OwnedType = "calendar" | "space" | "resource" | "event";

export async function isAdmin(
  calendarId: Hash,
  publicKey: PublicKey,
): Promise<boolean> {
  const user = await users.get(calendarId, publicKey);
  return user?.role == "admin";
}

export async function amAdmin(calendarId: Hash): Promise<boolean> {
  const myPublicKey = await identity.publicKey();
  return await isAdmin(calendarId, myPublicKey);
}

export async function isOwner(
  hash: Hash,
  publicKey: PublicKey,
  type: OwnedType,
): Promise<boolean> {
  switch (type) {
    case "calendar":
      const calendar = await calendars.findOne(hash);
      return calendar?.ownerId == publicKey;
    case "space":
      const space = await spaces.findById(hash);
      return space?.ownerId == publicKey;
    case "resource":
      const resource = await resources.findById(hash);
      return resource?.ownerId == publicKey;
    case "event":
      const event = await events.findById(hash);
      return event?.ownerId == publicKey;
  }
}

export async function amOwner(
  hash: Hash,
  type: OwnedType,
): Promise<boolean> {
  const myPublicKey = await identity.publicKey();
  return await isOwner(hash, myPublicKey, type);
}

/*
 * Commands
 */

export async function makeAdmin(
  calendarId: Hash,
  publicKey: PublicKey,
): Promise<OperationId> {
  const amAdmin = await auth.amAdmin(calendarId);
  if (!amAdmin) {
    throw new Error("user is not an admin");
  }

  const user_role_assigned: UserRoleAssigned = {
    type: "user_role_assigned",
    data: {
      publicKey,
      role: "admin",
    },
  };

  const [operationId, streamId] = await publish.toCalendar(
    calendarId,
    user_role_assigned,
  );

  await promiseResult(operationId);

  return operationId;
}

/*
 * Processor
 */

export async function process(message: ApplicationMessage) {
  const meta = message.meta;
  const { data, type } = message.data;

  switch (type) {
    case "user_role_assigned":
      return await onUserRoleAssigned(meta, data);
  }
}

async function onUserRoleAssigned(
  meta: StreamMessageMeta,
  data: UserRoleAssigned["data"],
) {
  // @TODO: check the author is an admin, if not error so that the operation is not ack'd
  // @TODO: assign role to user in users table.
  // @TODO: request replay of all un-ack'd messages.
}
