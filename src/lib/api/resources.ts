import { db } from "$lib/db";
import { invoke } from "@tauri-apps/api/core";
import { publicKey } from "./identity";
import { TopicFactory } from "./topics";
import { StreamFactory } from "./streams";

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

export async function create(
  calendarId: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  let calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    throw new Error("calendar not found");
  }

  const topic = new TopicFactory(calendar.id);
  const stream = new StreamFactory(calendar.streamId, calendar.streamOwner);

  let resource_created: ResourceCreated = {
    type: "resource_created",
    data: {
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    payload: resource_created,
    streamArgs: stream.calendar(),
    topic: topic.calendar(),
  });
  return hash;
}

export async function update(
  calendarId: Hash,
  resourceId: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  let calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    throw new Error("calendar not found");
  }

  const topic = new TopicFactory(calendar.id);
  const stream = new StreamFactory(calendar.streamId, calendar.streamOwner);

  let resourceUpdated: ResourceUpdated = {
    type: "resource_updated",
    data: {
      id: resourceId,
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    payload: resourceUpdated,
    streamArgs: stream.calendar(),
    topic: topic.calendar(),
  });
  return hash;
}

export async function deleteResource(
  calendarId: Hash,
  resourceId: Hash,
): Promise<Hash> {
  let calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    throw new Error("calendar not found");
  }

  const topic = new TopicFactory(calendar.id);
  const stream = new StreamFactory(calendar.streamId, calendar.streamOwner);

  let resource_deleted: ResourceDeleted = {
    type: "resource_deleted",
    data: {
      id: resourceId,
    },
  };
  let hash: Hash = await invoke("publish", {
    payload: resource_deleted,
    streamArgs: stream.calendar(),
    topic: topic.calendar(),
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
    id: meta.operationId,
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
