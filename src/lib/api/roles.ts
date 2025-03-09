/*
 * Queries
 */

import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { invoke } from "@tauri-apps/api/core";
import { auth, calendars, publish } from ".";
import { TopicFactory } from "./topics";

/*
 * Commands
 */

/*
 * Assign a role to the user associated with the provided public key and calendar.
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
  const { meta, data } = message;

  if (data.type == "user_role_assigned") {
    return await onUserRoleAssigned(meta, data.data);
  }
}

async function onUserRoleAssigned(
  meta: StreamMessageMeta,
  data: UserRoleAssigned["data"],
) {
  // Update the user's role.
  await db.users.update([meta.stream.id, data.publicKey], { role: data.role });

  // Request that all un-ack'd operations from this topic a replayed.
  //
  // We do this because an authors role has changed, which may mean that operations we received
  // earlier, and rejected due to insufficient permissions, would now be processed correctly.
  const topic = new TopicFactory(meta.stream.id);
  await invoke("replay", { topic: topic.calendar() });
}
