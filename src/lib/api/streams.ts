import { db } from "$lib/db";

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Stream | undefined> {
  return await db.streams.get({ id });
}

export async function add(stream: Stream) {
  await db.streams.add(stream);
}
