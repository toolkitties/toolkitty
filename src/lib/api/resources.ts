import { db } from "$lib/db";
import { auth, publish, resources } from ".";
import { getActiveCalendarId } from "./calendars";
import { promiseResult } from "$lib/promiseMap";

/**
 * Queries
 */

/**
 * Get resources that are associated with the passed calendar
 */
export function findMany(calendarId: Hash): Promise<Resource[]> {
  return db.resources.where({ calendarId }).toArray();
}

/**
 * Get all calendar resources that are owned by the passed public key.
 */
export function findByOwner(
  calendarId: Hash,
  ownerId: PublicKey,
): Promise<Resource[]> {
  return db.resources.where({ calendarId, ownerId }).toArray();
}

/**
 * Get one event by its ID.
 */
export function findById(id: Hash): Promise<Resource | undefined> {
  return db.resources.get({ id: id });
}

export async function isOwner(
  resourceId: Hash,
  publicKey: PublicKey,
): Promise<boolean> {
  return auth.isOwner(resourceId, publicKey, "resource");
}

export async function amOwner(resourceId: Hash): Promise<boolean> {
  return auth.amOwner(resourceId, "resource");
}

/**
 * Commands
 */

/**
 * Create a calendar resource.
 */
export async function create(
  calendarId: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  let resourceCreated: ResourceCreated = {
    type: "resource_created",
    data: {
      fields,
    },
  };
  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    calendarId!,
    resourceCreated,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Update a calendar resource.
 */
export async function update(
  resourceId: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  const resource = await resources.findById(resourceId);

  const amAdmin = await auth.amAdmin(resource!.calendarId);
  const amOwner = await resources.amOwner(resourceId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to update this resource");
  }

  const resourceUpdated: ResourceUpdated = {
    type: "resource_updated",
    data: {
      id: resourceId,
      fields,
    },
  };
  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    resource!.calendarId,
    resourceUpdated,
  );

  await promiseResult(operationId);

  return operationId;
}

/**
 * Delete a calendar resource.
 */
export async function deleteResource(resourceId: Hash): Promise<Hash> {
  const resource = await resources.findById(resourceId);

  const amAdmin = await auth.amAdmin(resource!.calendarId);
  const amOwner = await resources.amOwner(resourceId);
  if (!amAdmin && !amOwner) {
    throw new Error("user does not have permission to delete this resource");
  }

  const resourceDeleted: ResourceDeleted = {
    type: "resource_deleted",
    data: {
      id: resourceId,
    },
  };

  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    resource!.calendarId,
    resourceDeleted,
  );

  await promiseResult(operationId);

  return operationId;
}

//TODO: Move to class so we don't have to export as an alias
export { deleteResource as delete };

/*
 * Processor
 */

export async function process(message: ApplicationMessage) {
  const meta = message.meta;
  const { data, type } = message.data;

  switch (type) {
    case "resource_created":
      return await onResourceCreated(meta, data);
    case "resource_updated":
      return await onResourceUpdated(meta, data);
    case "resource_deleted":
      return await onResourceDeleted(meta, data);
  }
}

async function onResourceCreated(
  meta: StreamMessageMeta,
  data: ResourceCreated["data"],
) {
  let {
    name,
    description,
    contact,
    link,
    images,
    availability,
    multiBookable,
  } = data.fields;

  await db.resources.add({
    id: meta.operationId,
    calendarId: meta.stream.id,
    ownerId: meta.author,
    booked: [],
    name,
    description,
    contact,
    link,
    images,
    availability,
    multiBookable,
  });
}

async function onResourceUpdated(
  meta: StreamMessageMeta,
  data: ResourceUpdated["data"],
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
    throw new Error("author does not have permission to update this resource");
  }

  await db.resources.update(data.id, data.fields);
}

async function onResourceDeleted(
  meta: StreamMessageMeta,
  data: ResourceDeleted["data"],
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
    throw new Error("author does not have permission to delete this resource");
  }

  await db.resources.delete(data.id);
}
