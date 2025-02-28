import { db } from "$lib/db";
import { publish, spaces } from ".";
import { promiseResult } from "$lib/promiseMap";

/**
 * Queries
 */

/**
 * Get spaces that are associated with the currently active calendar
 */
export async function findMany(calendarId: Hash): Promise<Space[]> {
  return await db.spaces.where({ calendarId }).toArray();
}

/**
 * Get all spaces that I am the owner of.
 */
export async function findByOwner(
  calendarId: Hash,
  ownerId: PublicKey,
): Promise<Space[]> {
  return await db.spaces.where({ calendarId, ownerId }).toArray();
}

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Space | undefined> {
  return await db.spaces.get({ id });
}

/**
 * Commands
 */

export async function create(calendarId: Hash, fields: SpaceFields): Promise<Hash> {
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

export async function update(
  spaceId: Hash,
  fields: SpaceFields,
): Promise<Hash> {
  const space = await spaces.findById(spaceId);
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

export async function deleteSpace(spaceId: Hash): Promise<Hash> {
  const space = await spaces.findById(spaceId);
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
      return await onSpaceUpdated(meta, data);
    case "space_deleted":
      return await onSpaceDeleted(meta, data);
  }
}

async function onSpaceCreated(
  meta: StreamMessageMeta,
  data: SpaceCreated["data"],
) {
  const {
    type,
    name,
    location,
    capacity,
    accessibility,
    description,
    contact,
    link,
    images,
    availability,
    multiBookable,
  } = data.fields;

  await db.spaces.add({
    id: meta.operationId,
    calendarId: meta.stream.id,
    ownerId: meta.author,
    booked: [],
    type,
    name,
    location,
    capacity,
    accessibility,
    description,
    contact,
    link,
    images,
    availability,
    multiBookable,
  });
}

async function onSpaceUpdated(
  meta: StreamMessageMeta,
  data: SpaceUpdated["data"],
) {
  await validateUpdateDelete(meta.author, data.id);

  const {
    type,
    name,
    location,
    capacity,
    accessibility,
    description,
    contact,
    link,
    images,
    availability,
    multiBookable,
  } = data.fields;

  await db.spaces.update(data.id, {
    type,
    name,
    location,
    capacity,
    accessibility,
    description,
    contact,
    link,
    images,
    availability,
    multiBookable,
  });
}

async function onSpaceDeleted(
  meta: StreamMessageMeta,
  data: SpaceDeleted["data"],
) {
  await validateUpdateDelete(meta.author, data.id);
  await db.spaces.delete(data.id);
}

/**
 * Validation
 */

async function validateUpdateDelete(publicKey: PublicKey, spaceId: Hash) {
  const space = await db.spaces.get(spaceId);

  // The space must already exist.
  if (!space) {
    throw new Error("space does not exist");
  }

  // Only the space owner can perform updates and deletes.
  if (space.ownerId != publicKey) {
    throw new Error("non-owner update or delete");
  }
}
