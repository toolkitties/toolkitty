/*
 * Processor
 */

import {
  bookings,
  calendars,
  events,
  resources,
  spaces,
  users,
  topics,
} from ".";
import { TopicFactory } from "./topics";

export async function process(message: ApplicationMessage) {
  const { meta, data } = message;

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
    return await onUserProfileUpdated(meta);
  } else if (data.type == "user_role_assigned") {
    return await onUserRoleAssigned(meta, data.data);
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
}

async function onBookingResponse(
  meta: StreamMessageMeta,
  data: BookingRequestAccepted["data"] | BookingRequestRejected["data"],
) {
  const request = await bookings.findRequest(data.requestId);
  if (!request) {
    const topic = new TopicFactory(meta.stream.id);
    await topics.replay(topic.calendar());
    throw new Error("resource request not yet received");
  }
}

async function onCalendarEdit(
  meta: StreamMessageMeta,
  data: CalendarUpdated["data"] | CalendarDeleted["data"] | PageUpdated["data"],
) {
  let calendar = await calendars.findOne(data.id);
  if (!calendar) {
    const topic = new TopicFactory(meta.stream.id);
    await topics.replay(topic.calendar());
    throw new Error("calendar not yet received");
  }
}

async function onSpaceEdit(
  meta: StreamMessageMeta,
  data: SpaceUpdated["data"] | SpaceDeleted["data"],
) {
  let space = await spaces.findById(data.id);
  if (!space) {
    const topic = new TopicFactory(meta.stream.id);
    await topics.replay(topic.calendar());
    throw new Error("space not yet received");
  }
}

async function onResourceEdit(
  meta: StreamMessageMeta,
  data: ResourceUpdated["data"] | ResourceDeleted["data"],
) {
  let resource = await resources.findById(data.id);
  if (!resource) {
    const topic = new TopicFactory(meta.stream.id);
    await topics.replay(topic.calendar());
    throw new Error("resource not yet received");
  }
}

async function onEventEdit(
  meta: StreamMessageMeta,
  data: EventUpdated["data"] | EventDeleted["data"],
) {
  let event = await events.findById(data.id);
  if (!event) {
    const topic = new TopicFactory(meta.stream.id);
    await topics.replay(topic.calendar());
    throw new Error("event not yet received");
  }
}

async function onUserProfileUpdated(meta: StreamMessageMeta) {
  const user = await users.get(meta.stream.id, meta.author);
  if (!user) {
    const topic = new TopicFactory(meta.stream.id);
    await topics.replay(topic.calendar());
    throw new Error("user not yet received");
  }
}

async function onUserRoleAssigned(
  meta: StreamMessageMeta,
  data: UserRoleAssigned["data"],
) {
  const user = await users.get(meta.stream.id, data.publicKey);
  if (!user) {
    const topic = new TopicFactory(meta.stream.id);
    await topics.replay(topic.calendar());
    throw new Error("user not yet received");
  }
}

async function onCalendarAccessResponse(meta: StreamMessageMeta) {
  const calendar = await calendars.findOne(meta.stream.id);
  if (!calendar) {
    const topic = new TopicFactory(meta.stream.id);
    await topics.replay(topic.calendar());
    throw new Error("calendar not yet received");
  }

  // @TODO: access requests and responses are designed in a way that it doesn't matter which order
  // they arrive in, do we actually want that though? We could just replay un-acked'd messages in
  // order to handle out-of-order delivery as we do elsewhere.
  //   const request = await access.findRequestByid(data.requestId);
  //   if (!request) {
  //     throw new Error("calendar access request not yet received");
  //   }
}
