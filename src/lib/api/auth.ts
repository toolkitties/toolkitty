/*
 * Queries
 */

import { db } from "$lib/db";
import { promiseResult } from "$lib/promiseMap";
import { invoke } from "@tauri-apps/api/core";
import {
  auth,
  bookings,
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
import { requestAccess } from "./access";

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
  await authorize(message.meta, message.data);
}

async function authorize(meta: StreamMessageMeta, data: ApplicationEvent) {
  if (
    data.type == "booking_request_accepted" ||
    data.type == "booking_request_rejected"
  ) {
    return await onBookingResponse(meta, data.data);
  }

  // Users with "admin" role can perform all actions so we return now already if that is the case.
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  const isOwner = await auth.isOwner(meta.stream.id, meta.author, "calendar");
  if (isAdmin || isOwner) {
    return;
  }

  if (
    data.type == "calendar_updated" ||
    data.type == "calendar_deleted" ||
    data.type == "page_updated"
  ) {
    return await onCalendarEdit(meta, data.data);
  } else if (data.type == "space_updated" || data.type == "space_deleted") {
    return await onSpaceEdit(meta, data.data);
  } else if (
    data.type == "resource_updated" ||
    data.type == "resource_deleted"
  ) {
    return await onResourceEdit(meta, data.data);
  } else if (data.type == "event_updated" || data.type == "event_deleted") {
    return await onEventEdit(meta, data.data);
  } else if (data.type == "user_profile_updated") {
    return await onUserProfileUpdated(meta, data.data);
  } else if (data.type == "user_role_assigned") {
    return await onUserRoleAssigned(meta, data.data);
  } else if (
    data.type == "calendar_access_accepted" ||
    data.type == "calendar_access_rejected"
  ) {
    return await onCalendarAccessResponse(meta, data.data);
  }

  return await fallback(meta, data);
}

async function onBookingResponse(
  meta: StreamMessageMeta,
  data: BookingRequestAccepted["data"] | BookingRequestRejected["data"],
) {
  const request = await bookings.findRequest(data.requestId);
  if (!request) {
    throw new Error("resource request does not exist");
  }

  const isOwner = await resources.isOwner(request.resourceId, meta.author);

  if (!isOwner) {
    throw new Error(
      "author does not have permission to accept or reject a booking request for this resource",
    );
  }
}

async function onCalendarEdit(
  meta: StreamMessageMeta,
  data: CalendarUpdated["data"] | CalendarDeleted["data"] | PageUpdated["data"],
) {
  let calendar = await calendars.findOne(data.id);

  // The calendar must already exist.
  if (!calendar) {
    throw new Error("calendar does not exist");
  }

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(data.id, meta.author);
  const isOwner = await calendars.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error(
      "author does not have permission to update or delete this calendar",
    );
  }
}

async function onSpaceEdit(
  meta: StreamMessageMeta,
  data: SpaceUpdated["data"] | SpaceDeleted["data"],
) {
  let space = await spaces.findById(data.id);

  // The space must already exist.
  if (!space) {
    throw new Error("space does not exist");
  }

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  const isOwner = await spaces.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error(
      "author does not have permission to update or delete this space",
    );
  }
}

async function onResourceEdit(
  meta: StreamMessageMeta,
  data: ResourceUpdated["data"] | ResourceDeleted["data"],
) {
  let resource = await db.resources.get(data.id);

  // The resource must already exist.
  if (!resource) {
    throw new Error("resource does not exist");
  }

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  const isOwner = await resources.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error(
      "author does not have permission to update or delete this resource",
    );
  }
}

async function onEventEdit(
  meta: StreamMessageMeta,
  data: EventUpdated["data"] | EventDeleted["data"],
) {
  let event = await events.findById(data.id);

  // The event must already exist.
  if (!event) {
    throw new Error("event does not exist");
  }

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(event!.calendarId, meta.author);
  const isOwner = await events.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error(
      "author does not have permission to update or delete this event",
    );
  }
}

async function onUserProfileUpdated(
  meta: StreamMessageMeta,
  data: UserProfileUpdated["data"],
) {
  // @TODO: implement user profile updates.
  throw new Error("user profile updates not supported yet!");
}

async function onUserRoleAssigned(
  meta: StreamMessageMeta,
  data: UserRoleAssigned["data"],
) {
  // Check if the author has permission to assign roles in this calendar.
  const isOwner = await calendars.isOwner(meta.stream.id, meta.author);
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error("author does not have permission assign user roles for this calendar");
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

async function onCalendarAccessResponse(
  meta: StreamMessageMeta,
  data: CalendarAccessAccepted["data"] | CalendarAccessRejected["data"],
) {
  const calendarId = data.requestId;

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(calendarId, meta.author);
  const isOwner = await calendars.isOwner(calendarId, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error(
      "author does not have permission to accept or reject an access request to this calendar",
    );
  }
}

async function fallback(meta: StreamMessageMeta, data: ApplicationEvent) {
  throw new Error("unknown message types not allowed");
}
