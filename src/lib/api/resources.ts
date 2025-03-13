import { db } from "$lib/db";
import { auth, publish, resources } from ".";
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
): Promise<OwnerResourceEnriched[]> {
  return db.transaction("r", db.resources, db.bookingRequests, async () => {
    const myResources: OwnerResourceEnriched[] = await db.resources
      .where({ calendarId, ownerId })
      .toArray();
    // For each space check if there are any pending bookings
    for (const resource of myResources) {
      resource.pendingBookingRequests = await db.bookingRequests
        .where({ resourceId: resource.id })
        .toArray();
    }
    return myResources;
  });
}

/**
 * Get one event by its ID.
 */
export function findById(id: Hash): Promise<Resource | undefined> {
  return db.resources.get({ id: id });
}

/**
 * Returns a collection of resources which have _some_ availability in the timespan provided.
 */
export function findByTimespan(
  calendarId: Hash,
  timeSpan: TimeSpan,
): Promise<Resource[]> {
  return db.resources
    .where({ calendarId })
    .filter((resource) => {
      if (resource.availability == "always") {
        return true;
      }
      for (const span of resource.availability) {
        const isSub = isSubTimespan(timeSpan.start, timeSpan.end, span);
        if (isSub) {
          return true;
        }
      }
      return false;
    })
    .toArray();
}

/**
 * Find all accepted bookings for a resource and time span.
 */
export function findBookings(
  resourceId: Hash,
  timeSpan: TimeSpan,
): Promise<BookingRequest[]> {
  return db.bookingRequests
    .where({
      resourceId: resourceId,
      status: "accepted",
    })
    .filter((booking) => {
      return isSubTimespan(timeSpan.start, timeSpan.end, booking.timeSpan);
    })
    .toArray();
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
  const resourceCreated: ResourceCreated = {
    type: "resource_created",
    data: {
      fields,
    },
  };
  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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
  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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

  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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
      return await onResourceUpdated(data);
    case "resource_deleted":
      return await onResourceDeleted(data);
  }
}

async function onResourceCreated(
  meta: StreamMessageMeta,
  data: ResourceCreated["data"],
): Promise<void> {
  try {
    await db.resources.add({
      id: meta.operationId,
      calendarId: meta.stream.id,
      ownerId: meta.author,
      booked: [],
      ...data.fields,
    });
  } catch (e) {
    console.error(e);
  }
}

function onResourceUpdated(data: ResourceUpdated["data"]): Promise<void> {
  const resourceId = data.id;
  const resourceAvailability = data.fields.availability;

  return db.transaction("rw", db.resources, db.bookingRequests, async () => {
    // Update `isavalid` field of all booking requests associated with this space.
    await db.bookingRequests.where({ resourceId }).modify((request) => {
      if (resourceAvailability == "always") {
        request.isValid = "true";
        return;
      }
      request.isValid = "false";
      for (const span of resourceAvailability) {
        const isValid = isSubTimespan(span.start, span.end, request.timeSpan);

        if (isValid) {
          request.isValid = "true";
          break;
        }
      }
      request.isValid = "false";
    });

    // @TODO: we could show a toast to the user if a previously valid request timespan now became
    // invalid.

    // @TODO: add related location to spaces object.
    await db.resources.update(data.id, data.fields);
  });
}

function onResourceDeleted(data: ResourceDeleted["data"]): Promise<void> {
  const resourceId = data.id;

  return db.transaction("rw", db.resources, db.bookingRequests, async () => {
    // Update `isavalid` field of all booking requests associated with this resource.
    await db.bookingRequests.where({ resourceId }).modify({ isValid: "false" });

    // @TODO: we could show a toast to the user if a previously valid event timespan now became
    // invalid.

    await db.resources.delete(resourceId);
  });
}
