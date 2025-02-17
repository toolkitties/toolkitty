import { resources } from "$lib/api/data";
import { db } from "$lib/db";
import { invoke } from "@tauri-apps/api/core";

/**
 * Queries
 */

/**
 * Get resources that are associated with the currently active calendar
 */
export async function findMany(): Promise<Resource[]> {
  //TODO: Return resources from db as liveQuery and add params

  // return test data.
  return resources;
}

/**
 * Get all resources that I am the owner of.
 */
export async function findMine(): Promise<Resource[]> {
  //TODO: Return resources from db with ownerId that is equal to users public key.

  // return test data.
  return resources;
}

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Resource> {
  //TODO: Return events from db

  // return test data.
  return resources[0];
}

/**
 * Commands
 */

export async function create(
  calendar_id: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  let resource_created: ResourceCreated = {
    type: "resource_created",
    data: {
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: resource_created,
  });
  return hash;
}

export async function update(
  calendar_id: Hash,
  resource_id: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  let resource_updated: ResourceUpdated = {
    type: "resource_updated",
    data: {
      id: resource_id,
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: resource_updated,
  });
  return hash;
}

export async function deleteResource(
  calendar_id: Hash,
  resource_id: Hash,
): Promise<Hash> {
  let resource_deleted: ResourceDeleted = {
    type: "resource_deleted",
    data: {
      id: resource_id,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: resource_deleted,
  });
  return hash;
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
    id: meta.calendarId,
    ownerId: meta.publicKey,
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
  await validateUpdateDelete(meta.publicKey, data.id);

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
  await validateUpdateDelete(meta.publicKey, data.id);
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
