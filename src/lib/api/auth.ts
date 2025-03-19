/*
 * Queries
 */

import {
  auth,
  bookings,
  calendars,
  events,
  identity,
  resources,
  spaces,
  users,
} from ".";

type OwnedType = "calendar" | "space" | "resource" | "event";

/*
 * Check if the user associated with the given public key and calendar has been assigned the
 * "admin" role.
 */
export async function isAdmin(
  calendarId: Hash,
  publicKey: PublicKey,
): Promise<boolean> {
  const user = await users.get(calendarId, publicKey);
  return user?.role == "admin";
}

/*
 * Check if the local user has been given the "admin" role for this calendar.
 */
export async function amAdmin(calendarId: Hash): Promise<boolean> {
  const myPublicKey = await identity.publicKey();
  return await isAdmin(calendarId, myPublicKey);
}

/*
 * Check if the user associated with the given public key of the owner of a calendar, space,
 * resource or event.
 */
export async function isOwner(
  hash: Hash,
  publicKey: PublicKey,
  type: OwnedType,
): Promise<boolean> {
  switch (type) {
    case "calendar": {
      const calendar = await calendars.findById(hash);
      return calendar?.ownerId == publicKey;
    }
    case "space": {
      const space = await spaces.findById(hash);
      return space?.ownerId == publicKey;
    }
    case "resource": {
      const resource = await resources.findById(hash);
      return resource?.ownerId == publicKey;
    }
    case "event": {
      const event = await events.findById(hash);
      return event?.ownerId == publicKey;
    }
  }
}

/*
 * Check if the local user is the owner of a calendar, space, resource or event.
 */
export async function amOwner(hash: Hash, type: OwnedType): Promise<boolean> {
  const myPublicKey = await identity.publicKey();
  return await isOwner(hash, myPublicKey, type);
}

/*
 * Processor
 */

const PUBLIC_MESSAGE_TYPES: string[] = [
  "calendar_access_requested",
  "calendar_created",
  "space_created",
  "resource_created",
  "event_created",
  "booking_requested",
];

/*
 * The auth processor checks that the author of a message holds suitable authority to perform the
 * action described by the message. Authority can be gained from being the owner of a particular
 * piece of data, or by having a role assigned. Different message types require different auth
 * checks, custom handlers are used based on the message `type` field. An error is thrown if any
 * message author does not have the required authority level, this means the message does not
 * arrive at any subsequent processors and will not be "acknowledged". If an unknown message type
 * is received then it is immediately rejected with an error.
 *
 * There may be cases where we receive role assignment messages out-of-order (after we already
 * rejected messages which would now be accepted), in order to account for this situation it is
 * assumed that any un-auth'd messages will be replayed when a users role changes.
 *
 */
export async function process(message: ApplicationMessage) {
  const { meta, data } = message;

  // Public message types don't pass through the auth processor.
  if (PUBLIC_MESSAGE_TYPES.includes(message.data.type)) {
    return;
  }

  // All other messages require that the author has relevant authority to perform it's action.
  if (
    data.type == "booking_request_accepted" ||
    data.type == "booking_request_rejected"
  ) {
    return await onBookingResponse(meta, data.data);
  } else if (
    data.type == "calendar_access_accepted" ||
    data.type == "calendar_access_rejected"
  ) {
    return await onCalendarAccessResponse(meta);
  } else if (data.type == "user_profile_updated") {
    return await onUserProfileUpdated();
  } else if (data.type == "user_role_assigned") {
    return await onUserRoleAssigned(meta);
  } else if (
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
  }

  // If the message is of an unexpected type the fallback behaviour is to reject it as
  // unauthorized.
  return await fallback();
}

async function onBookingResponse(
  meta: StreamMessageMeta,
  data: BookingRequestAccepted["data"] | BookingRequestRejected["data"],
) {
  const request = await bookings.findById(data.requestId);
  if (request!.resourceType === "resource") {
    const isOwner = await resources.isOwner(request!.resourceId, meta.author);
    if (!isOwner) {
      throw new Error(
        "author does not have permission to accept or reject a booking request for this resource",
      );
    }
  } else if (request!.resourceType === "space") {
    const isOwner = await spaces.isOwner(request!.resourceId, meta.author);
    if (!isOwner) {
      throw new Error(
        "author does not have permission to accept or reject a booking request for this space",
      );
    }
  }
}

async function onCalendarEdit(
  meta: StreamMessageMeta,
  data: CalendarUpdated["data"] | CalendarDeleted["data"] | PageUpdated["data"],
) {
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
  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  const isOwner = await events.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error(
      "author does not have permission to update or delete this event",
    );
  }
}

async function onUserProfileUpdated() {
  // @TODO: implement user profile updates.
  throw new Error("user profile updates not supported yet!");
}

async function onUserRoleAssigned(meta: StreamMessageMeta) {
  // Check if the author has permission to assign roles in this calendar.
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  const isOwner = await calendars.isOwner(meta.stream.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error(
      "author does not have permission to assign user roles for this calendar",
    );
  }
}

async function onCalendarAccessResponse(meta: StreamMessageMeta) {
  // @TODO: we should check here if the calendar _stream_ already exists in the database. We may
  // not have received the actual "calendar_created" event yet, but we _must_ know the stream
  // already if want to handle access requests and responses.

  // @TODO: should we also check that the request itself exists?

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  const isOwner = await calendars.isOwner(meta.stream.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error(
      "author does not have permission to accept or reject an access request to this calendar",
    );
  }
}

async function fallback() {
  throw new Error("unknown message types not allowed");
}
