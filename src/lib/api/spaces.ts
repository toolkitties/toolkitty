import { db } from "$lib/db";
import { auth, bookings, publish, spaces } from ".";
import { promiseResult } from "$lib/promiseMap";
import { TimeSpanClass } from "$lib/timeSpan";
import { shouldUpdate } from "$lib/lww";

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
export async function findByOwner(
  calendarId: Hash,
  ownerId: PublicKey,
): Promise<OwnerSpaceEnriched[]> {
  const mySpaces: OwnerSpaceEnriched[] = await db.spaces
    .where({ calendarId, ownerId })
    .toArray();
  // For each space check if there are any pending bookings
  for (const space of mySpaces) {
    space.pendingBookingRequests = await bookings.findAll({
      resourceId: space.id,
      status: "pending",
    });
  }
  return mySpaces;
}

/**
 * Get one event by its ID.
 */
export function findById(id: Hash): Promise<Space | undefined> {
  return db.spaces.get({ id });
}

/**
 * Returns a collection of spaces which have _some_ availability in the timespan provided.
 */
export function findByTimeSpan(
  calendarId: Hash,
  timeSpan: TimeSpanClass,
): Promise<Space[]> {
  return db.spaces
    .where({ calendarId })
    .filter((space) => {
      if (space.availability == "always") {
        return true;
      }
      for (const span of space.availability) {
        const availabilityTimeSpan = new TimeSpanClass(span);
        const isSub = timeSpan.contains(availabilityTimeSpan);
        if (isSub) {
          return true;
        }
      }
      return false;
    })
    .toArray();
}

/**
 * Find all accepted bookings for a space and time span.
 */
export function findBookings(
  spaceId: Hash,
  timeSpan: TimeSpanClass,
): Promise<BookingRequest[]> {
  return bookings.findAll({
    resourceId: spaceId,
    from: timeSpan.startDate(),
    to: timeSpan.endDate(),
    status: "accepted",
  });
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

  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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
  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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

  const [operationId]: [Hash, Hash] = await publish.toCalendar(
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
      return await onSpaceDeleted(data);
  }
}

async function onSpaceCreated(
  meta: StreamMessageMeta,
  data: SpaceCreated["data"],
): Promise<void> {
  try {
    await db.spaces.add({
      id: meta.operationId,
      calendarId: meta.stream.id,
      ownerId: meta.author,
      createdAt: meta.timestamp,
      updatedAt: meta.timestamp,
      ...data.fields,
    });
  } catch (e) {
    console.error(e);
  }
}

function onSpaceUpdated(
  meta: StreamMessageMeta,
  data: SpaceUpdated["data"],
): Promise<void> {
  return db.transaction("rw", db.spaces, db.bookingRequests, async () => {
    const space = await db.spaces.get(data.id);
    if (!space) {
      // The space may have been deleted.
      return;
    }

    // Updates should only be applied if they have a greater timestamp or in the case of timestamp
    // equality, the hash is greater.
    if (
      !shouldUpdate(space.updatedAt, space.id, meta.timestamp, meta.operationId)
    ) {
      return;
    }

    // @TODO: add related location to spaces object.
    await db.spaces.update(data.id, {
      ...data.fields,
      updatedAt: meta.timestamp,
    });
  });
}

function onSpaceDeleted(data: SpaceDeleted["data"]): Promise<void> {
  const spaceId = data.id;
  return db.spaces.delete(spaceId);
}
