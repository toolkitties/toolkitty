/*
 * Queries
 */

import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { invoke } from "@tauri-apps/api/core";
import {
  auth,
  calendars,
  events,
  identity,
  publish,
  resources,
  spaces,
  streams,
  users,
} from ".";
import { TopicFactory } from "./topics";

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
      const calendarStream = await streams.findById(hash);
      return calendarStream?.owner == publicKey;
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

export async function amOwner(hash: Hash, type: OwnedType): Promise<boolean> {
  const myPublicKey = await identity.publicKey();
  return await isOwner(hash, myPublicKey, type);
}

/*
 * Commands
 */

export async function assignRole(
  calendarId: Hash,
  publicKey: PublicKey,
  role: Role,
): Promise<OperationId> {
  const amOwner = await calendars.amOwner(calendarId);
  const amAdmin = await auth.amAdmin(calendarId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to assign user roles");
  }

  const user_role_assigned: UserRoleAssigned = {
    type: "user_role_assigned",
    data: {
      publicKey,
      role,
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
  // Check if the author has permission to assign roles in this calendar.
  const isOwner = await calendars.isOwner(meta.stream.id, meta.author);
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error("author does not have permission to delete this event");
  }

  // Update the user's role.
  db.users.update([meta.stream.id, data.publicKey], { role: data.role });
  
  // Request that all un-ack'd operations from this topic a replayed.
  //
  // We do this because an authors role has changed, which may mean that operations we received
  // earlier, and rejected due to insufficient permissions, would now be processed correctly. 
  const topic = new TopicFactory(meta.stream.id);
  await invoke("replay", { topic: topic.calendar() });
}
