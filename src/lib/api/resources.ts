import { db } from "$lib/db";
import { publish, resources } from ".";
import { getActiveCalendarId } from "./calendars";
import { promiseResult } from "$lib/promiseMap";
import { isSubTimespan } from "$lib/utils";

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
  let resource = await resources.findById(resourceId);
  let resourceUpdated: ResourceUpdated = {
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
  let resource = await resources.findById(resourceId);
  let resourceDeleted: ResourceDeleted = {
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
  await validateUpdateDelete(meta.author, data.id);
  const resourceId = data.id;
  const resourceAvailability = data.fields.availability;

  db.transaction("rw", db.resources, db.bookingRequests, async () => {
    // Update `validTime` field of all booking requests associated with this space.
    await db.bookingRequests.where({ resourceId }).modify((request) => {
      if (resourceAvailability == "always") {
        request.validTime = true;
        return;
      }
      request.validTime = false;
      for (const span of resourceAvailability) {
        const validTime = isSubTimespan(span.start, span.end, request.timeSpan);

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
    await db.resources.update(data.id, data.fields);
  });
}

async function onResourceDeleted(
  meta: StreamMessageMeta,
  data: ResourceDeleted["data"],
) {
  await validateUpdateDelete(meta.author, data.id);
  const resourceId = data.id;

  db.transaction("rw", db.events, db.bookingRequests, async () => {
    // Update `validTime` field of all booking requests associated with this resource.
    await db.bookingRequests.where({ resourceId }).modify({ validTime: false });

    // @TODO: we could show a toast to the user if a previously valid event timespan now became
    // invalid.

    await db.spaces.delete(resourceId);
  });
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
