import { db } from "$lib/db";
import { publicKey } from "./identity";
import { publish } from ".";
import { getActiveCalendarId } from "./calendars";
import { promiseResult } from "$lib/promiseMap";

/**
 * Queries
 */

/**
 * Get resources that are associated with the currently active calendar
 */
export async function findMany(): Promise<Resource[]> {
  let resources = await db.resources.toArray();
  return resources;
}

/**
 * Get all resources that I am the owner of.
 */
export async function findMine(): Promise<Resource[]> {
  let myPublicKey = await publicKey();
  let resources = (await db.resources.toArray()).filter(
    (resource) => resource.ownerId == myPublicKey,
  );
  return resources;
}

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Resource | undefined> {
  let resource = (await db.resources.toArray()).filter(
    (resource) => resource.id == id,
  );

  if (resource.length == 0) {
    return;
  }

  return resource[0];
}

/**
 * Commands
 */

export async function create(fields: ResourceFields): Promise<Hash> {
  const calendarId = await getActiveCalendarId();
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

export async function update(
  resourceId: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  const calendarId = await getActiveCalendarId();
  let resourceUpdated: ResourceUpdated = {
    type: "resource_updated",
    data: {
      id: resourceId,
      fields,
    },
  };
  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    calendarId!,
    resourceUpdated,
  );

  await promiseResult(operationId);

  return operationId;
}

export async function deleteResource(resourceId: Hash): Promise<Hash> {
  const calendarId = await getActiveCalendarId();
  let resourceDeleted: ResourceDeleted = {
    type: "resource_deleted",
    data: {
      id: resourceId,
    },
  };

  const [operationId, streamId]: [Hash, Hash] = await publish.toCalendar(
    calendarId!,
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
  await validateUpdateDelete(meta.author, data.id);

  let {
    name,
    description,
    contact,
    link,
    images,
    availability,
    multiBookable,
  } = data.fields;

  await db.resources.update(data.id, {
    name,
    description,
    contact,
    link,
    images,
    availability,
    multiBookable,
  });
}

async function onResourceDeleted(
  meta: StreamMessageMeta,
  data: ResourceDeleted["data"],
) {
  await validateUpdateDelete(meta.author, data.id);
  await db.resources.delete(data.id);
}

/**
 * Validation
 */

async function validateUpdateDelete(publicKey: PublicKey, resourceId: Hash) {
  let resource = await db.resources.get(resourceId);

  // The resource must already exist.
  if (!resource) {
    throw new Error("resource does not exist");
  }

  // Only the resource owner can perform updates and deletes.
  if (resource.ownerId != publicKey) {
    throw new Error("non-owner update or delete on resource");
  }
}
