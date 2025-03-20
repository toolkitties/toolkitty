/*
 * Processor
 */

import {
  access,
  bookings,
  calendars,
  events,
  resources,
  spaces,
  users,
} from ".";

export async function process(message: ApplicationMessage) {
  const { meta, data } = message;

  // Next check that dependencies are met for the following message types.
  if (
    data.type == "booking_request_accepted" ||
    data.type == "booking_request_rejected"
  ) {
    return await onBookingResponse(data.data);
  } else if (data.type == "booking_requested") {
    return await onBookingRequest(data.data);
  } else if (
    data.type == "calendar_access_accepted" ||
    data.type == "calendar_access_rejected"
  ) {
    return await onCalendarAccessResponse(data.data, meta);
  } else if (data.type == "user_profile_updated") {
    return await onUserProfileUpdated(meta);
  } else if (data.type == "user_role_assigned") {
    await onUserRoleAssigned(meta, data.data);
  } else if (
    data.type == "calendar_updated" ||
    data.type == "calendar_deleted" ||
    data.type == "page_updated"
  ) {
    return await onCalendarEdit(data.data);
  } else if (data.type == "space_updated" || data.type == "space_deleted") {
    return await onSpaceEdit(data.data);
  } else if (
    data.type == "resource_updated" ||
    data.type == "resource_deleted"
  ) {
    return await onResourceEdit(data.data);
  } else if (data.type == "event_updated" || data.type == "event_deleted") {
    return await onEventEdit(data.data);
  }
}

async function onBookingRequest(data: BookingRequested["data"]) {
  const event = await events.findById(data.eventId);
  if (!event) {
    throw new Error("resource request event not yet received");
  }

  let resource;
  if (data.type == "space") {
    resource = await spaces.findById(data.resourceId);
  } else {
    resource = await resources.findById(data.resourceId);
  }

  if (!resource) {
    throw new Error("resource request resource not yet received");
  }
}

async function onBookingResponse(
  data: BookingRequestAccepted["data"] | BookingRequestRejected["data"],
) {
  const request = await bookings.findById(data.requestId);
  if (!request) {
    throw new Error("resource request not yet received");
  }
}

async function onCalendarEdit(
  data: CalendarUpdated["data"] | CalendarDeleted["data"] | PageUpdated["data"],
) {
  const calendar = await calendars.findById(data.id);
  if (!calendar?.name) {
    throw new Error("calendar not yet received");
  }
}

async function onSpaceEdit(data: SpaceUpdated["data"] | SpaceDeleted["data"]) {
  const space = await spaces.findById(data.id);
  if (!space) {
    throw new Error("space not yet received");
  }
}

async function onResourceEdit(
  data: ResourceUpdated["data"] | ResourceDeleted["data"],
) {
  const resource = await resources.findById(data.id);
  if (!resource) {
    throw new Error("resource not yet received");
  }
}

async function onEventEdit(data: EventUpdated["data"] | EventDeleted["data"]) {
  const event = await events.findById(data.id);
  if (!event) {
    throw new Error("event not yet received");
  }
}

async function onUserProfileUpdated(meta: StreamMessageMeta) {
  const calendarId = meta.stream.id;
  const user = await users.get(calendarId, meta.author);
  if (!user) {
    throw new Error("user not yet received");
  }
}

async function onUserRoleAssigned(
  meta: StreamMessageMeta,
  data: UserRoleAssigned["data"],
) {
  const calendarId = meta.stream.id;
  const user = await users.get(calendarId, data.publicKey);
  if (!user) {
    throw new Error("user not yet received");
  }
}

async function onCalendarAccessResponse(
  data: CalendarAccessAccepted["data"] | CalendarAccessRejected["data"],
  meta: StreamMessageMeta,
) {
  const calendarId = meta.stream.id;
  const calendar = await calendars.findById(calendarId);
  if (!calendar) {
    throw new Error("calendar not yet received");
  }

  const request = await access.findRequestByid(data.requestId);
  if (!request) {
    throw new Error("calendar access request not yet received");
  }
}
