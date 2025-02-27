import { db } from "$lib/db";

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Stream | undefined> {
  let streams = (await db.streams.toArray()).filter(
    (streams) => streams.id == id,
  );

  if (streams.length == 0) {
    return;
  }

  return streams[0];
}

export async function add(stream: Stream) {
  await db.streams.add(stream)
}
