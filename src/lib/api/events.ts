// import { events } from '$lib/api/data'

/**
 * Queries
 */


/**
 * Get events that are associated with the currently active calendar
 */
export async function findMany(): Promise<CalendarEvent[]> {
  //TODO: Return events from db as liveQuery and add params
  // return test data.
  return []
}

/**
 * Get all events that I am the owner of.
 */
export async function findMine(): Promise<CalendarEvent[]> {
  //TODO: Return events from db with ownerId that is equal to users public key.
  // return test data.
  return []
}

/**
 * Get one event via its id
 */
export async function findById(id: Hash): Promise<CalendarEvent | undefined> {
  //TODO: Return events from db

  // return test data.
  return;
}


/**
 * Commands
 */


export async function create(data: CalendarEvent) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}

export async function update(data: CalendarEvent) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}

async function deleteEvent(id: Hash) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}

//TODO: Move to class so we don't have to export as an alias
export { deleteEvent as delete };


//TODO: Add processor