import { db } from "$lib/db";
import { publish, spaces } from ".";
import { promiseResult } from "$lib/promiseMap";
import { isSubTimespan } from "$lib/utils";

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
    ...data.fields,
  });
}

async function onSpaceUpdated(
  meta: StreamMessageMeta,
  data: SpaceUpdated["data"],
) {
  await validateUpdateDelete(meta.author, data.id);
  const spaceId = data.id;
  const spaceAvailability = data.fields.availability;

  db.transaction("rw", db.events, db.bookingRequests, async () => {
    // Update `validTime` field of all booking requests associated with this space.
    await db.bookingRequests
      .where({ resourceId: spaceId })
      .modify((request) => {
        if (spaceAvailability == "always") {
          request.validTime = true;
          return;
        }
        request.validTime = false;
        for (const span of spaceAvailability) {
          const validTime = isSubTimespan(
            span.start,
            span.end,
            request.timeSpan,
          );

          if (validTime) {
            request.validTime = true;
            return;
          }
        }
        request.validTime = false;
      });

    // @TODO: we could show a toast to the user if a previously valid request timespan now became
    // invalid.

    // @TODO: add related location to spaces object.
    await db.spaces.update(data.id, data.fields);
  });
}

async function onSpaceDeleted(
  meta: StreamMessageMeta,
  data: SpaceDeleted["data"],
) {
  await validateUpdateDelete(meta.author, data.id);
  const spaceId = data.id;

  db.transaction("rw", db.events, db.bookingRequests, async () => {
    // Update `validTime` field of all booking requests associated with this event.
    await db.bookingRequests
      .where({ resourceId: spaceId })
      .modify({ validTime: false });

    // @TODO: we could show a toast to the user if a previously valid event timespan now became
    // invalid.

    await db.spaces.delete(spaceId);
  });
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
