import { db } from "$lib/db";
import { invoke } from "@tauri-apps/api/core";
import { publicKey } from "./identity";

/**
 * Queries
 */

/**
 * Get spaces that are associated with the currently active calendar
 */
export async function findMany(): Promise<Space[]> {
  let spaces = await db.spaces.toArray();
  return spaces;
}

/**
 * Get all spaces that I am the owner of.
 */
export async function findMine(): Promise<Space[]> {
  let myPublicKey = await publicKey();
  let spaces = (await db.spaces.toArray()).filter(
    (space) => space.ownerId == myPublicKey,
  );
  return spaces;
}

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Space | undefined> {
  let space = (await db.spaces.toArray()).filter((space) => space.id == id);

  if (space.length == 0) {
    return;
  }

  return space[0];
}

/**
 * Commands
 */

export async function create(
  calendarId: Hash,
  fields: SpaceFields,
): Promise<Hash> {
  let calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    throw new Error("calendar not found");
  }

  let space_created: SpaceCreated = {
    type: "space_created",
    data: {
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    payload: space_created,
    streamName: {
      owner: calendar.streamOwner,
      uuid: calendar.streamId,
      type: "data",
    },
  });
  return hash;
}

export async function update(
  calendarId: Hash,
  spaceId: Hash,
  fields: SpaceFields,
): Promise<Hash> {
  let calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    throw new Error("calendar not found");
  }

  let spaceUpdated: SpaceUpdated = {
    type: "space_updated",
    data: {
      id: spaceId,
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    payload: spaceUpdated,
    streamName: {
      owner: calendar.streamOwner,
      uuid: calendar.streamId,
      type: "data",
    },
  });
  return hash;
}

export async function deleteSpace(
  calendarId: Hash,
  spaceId: Hash,
): Promise<Hash> {
  let calendar = await db.calendars.get(calendarId);
  if (!calendar) {
    throw new Error("calendar not found");
  }

  let space_deleted: SpaceDeleted = {
    type: "space_deleted",
    data: {
      id: spaceId,
    },
  };

  let hash: Hash = await invoke("publish", {
    payload: space_deleted,
    streamName: {
      owner: calendar.streamOwner,
      uuid: calendar.streamId,
      type: "data",
    },
  });
  return hash;
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
  let {
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
    ownerId: meta.publicKey,
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
  await validateUpdateDelete(meta.publicKey, data.id);

  let {
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
  await validateUpdateDelete(meta.publicKey, data.id);
  await db.spaces.delete(data.id);
}

/**
 * Validation
 */

async function validateUpdateDelete(publicKey: PublicKey, spaceId: Hash) {
  let space = await db.spaces.get(spaceId);

  // The space must already exist.
  if (!space) {
    throw new Error("space does not exist");
  }

  // Only the space owner can perform updates and deletes.
  if (space.ownerId != publicKey) {
    throw new Error("non-owner update or delete");
  }
}
