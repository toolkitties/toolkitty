import { db } from "$lib/db";
import { auth, publish, spaces } from ".";
import { promiseResult } from "$lib/promiseMap";

/**
 * Queries
 */

/**
 * Get spaces that are associated with the passed calendar
 */
export function findMany(calendarId: Hash): Promise<Space[]> {
  return db.spaces.where({ calendarId }).toArray();
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
  
  const amAdmin = await auth.amAdmin(space!.calendarId);
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

  const amAdmin = await auth.amAdmin(space!.calendarId);
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
      return await onSpaceUpdated(meta, data);
    case "space_deleted":
      return await onSpaceDeleted(meta, data);
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
    ...data.fields
  });
}

async function onSpaceUpdated(
  meta: StreamMessageMeta,
  data: SpaceUpdated["data"],
) {
  let space = await db.spaces.get(data.id);

  // The space must already exist.
  if (!space) {
    throw new Error("space does not exist");
  }

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  const isOwner = await spaces.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error("author does not have permission to update this space");
  }

  await db.spaces.update(data.id, data.fields);
}

async function onSpaceDeleted(
  meta: StreamMessageMeta,
  data: SpaceDeleted["data"],
) {
  let space = await db.spaces.get(data.id);

  // The space must already exist.
  if (!space) {
    throw new Error("space does not exist");
  }

  // Check that the message author has the required permissions.
  const isAdmin = await auth.isAdmin(meta.stream.id, meta.author);
  const isOwner = await spaces.isOwner(data.id, meta.author);
  if (!isAdmin && !isOwner) {
    throw new Error("author does not have permission to delete this space");
  }

  await db.spaces.delete(data.id);
}
