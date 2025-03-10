import { db } from "$lib/db";
import { auth, publish, roles, spaces } from ".";
import { promiseResult } from "$lib/promiseMap";
import { TopicFactory } from "./topics";
import { invoke } from "@tauri-apps/api/core";

/**
 * Queries
 */

/**
 * Get spaces that are associated with the passed calendar
 */
export function findMany(calendarId: Hash): Promise<Space[]> {
  return db.spaces.where({ calendarId }).toArray();
}

export async function findManyWithinCalendarDates(
  calendarId: Hash,
): Promise<Space[]> {
  const calendar = await db.calendars.get(calendarId);
  const calendarStartDate = calendar!.startDate;
  const calendarEndDate = calendar!.endDate;

  return db.spaces
    .where({ calendarId })
    .filter((space) => {
      if (space.availability == "always") {
        return true;
      }
      for (const span of space.availability) {
        return isValidAvailability(calendarStartDate, calendarEndDate, span);
      }
      return false;
    })
    .toArray();
}

function isValidAvailability(
  calendarStartDate: Date,
  calendarEndDate: Date | undefined,
  timeSpan: TimeSpan,
): boolean {
  if (calendarEndDate == undefined) {
    return timeSpan.end > calendarStartDate;
  }

  return timeSpan.end > calendarStartDate || timeSpan.start < calendarEndDate;
}

/**
 * Get all calendar spaces that are owned by the passed public key.
 */
export function findByOwner(
  calendarId: Hash,
  ownerId: PublicKey,
): Promise<Space[]> {
  return db.spaces.where({ calendarId, ownerId }).toArray();
}

/**
 * Get one event by its ID.
 */
export function findById(id: Hash): Promise<Space | undefined> {
  return db.spaces.get({ id });
}

export async function isOwner(
  spaceId: Hash,
  publicKey: PublicKey,
): Promise<boolean> {
  return auth.isOwner(spaceId, publicKey, "space");
}

export async function amOwner(spaceId: Hash): Promise<boolean> {
  return auth.amOwner(spaceId, "space");
}

/**
 * Commands
 */

/**
 * Create a calendar space.
 */
export async function create(
  calendarId: Hash,
  fields: SpaceFields,
): Promise<Hash> {
  const spaceCreated: SpaceCreated = {
    type: "space_created",
    data: {
      fields,
    },
  };

  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    calendarId,
    spaceCreated,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Update a calendar space.
 */
export async function update(
  spaceId: Hash,
  fields: SpaceFields,
): Promise<Hash> {
  const space = await spaces.findById(spaceId);

  const amAdmin = await roles.amAdmin(space!.calendarId);
  const amOwner = await spaces.amOwner(spaceId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to update this space");
  }

  const spaceUpdated: SpaceUpdated = {
    type: "space_updated",
    data: {
      id: spaceId,
      fields,
    },
  };
  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    space!.calendarId,
    spaceUpdated,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Delete a calendar space.
 */
export async function deleteSpace(spaceId: Hash): Promise<Hash> {
  const space = await spaces.findById(spaceId);

  const amAdmin = await roles.amAdmin(space!.calendarId);
  const amOwner = await spaces.amOwner(spaceId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to delete this space");
  }

  const spaceDeleted: SpaceDeleted = {
    type: "space_deleted",
    data: {
      id: spaceId,
    },
  };

  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    space!.calendarId,
    spaceDeleted,
  );

  await promiseResult(operationId);

  return operationId;
}

//TODO: Move to class so we don't have to export as an alias
export { deleteSpace as delete };

/*
 * Processor
 */

export async function process(message: ApplicationMessage) {
  const meta = message.meta;
  const { data, type } = message.data;

  switch (type) {
    case "space_created":
      return await onSpaceCreated(meta, data);
    case "space_updated":
      return await onSpaceUpdated(data);
    case "space_deleted":
      return await onSpaceDeleted(data);
  }
}

async function onSpaceCreated(
  meta: StreamMessageMeta,
  data: SpaceCreated["data"],
) {
  await db.spaces.add({
    id: meta.operationId,
    calendarId: meta.stream.id,
    ownerId: meta.author,
    booked: [],
    ...data.fields,
  });

  // Replay un-ack'd messages which we may have received out-of-order.
  const topic = new TopicFactory(meta.stream.id);
  await invoke("replay", { topic: topic.calendar() });
}

async function onSpaceUpdated(data: SpaceUpdated["data"]) {
  await db.spaces.update(data.id, data.fields);
}

async function onSpaceDeleted(data: SpaceDeleted["data"]) {
  await db.spaces.delete(data.id);
}
