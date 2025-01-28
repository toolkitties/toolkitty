import { spaces } from '$lib/api/data'

/**
 * Queries
 */


/**
 * Get spaces that are associated with the currently active calendar
 */
export async function findMany(): Promise<Space[]> {
  //TODO: Return spaces from db as liveQuery and add params

  // return test data.
  return spaces
}

/**
 * Get all spaces that I am the owner of.
 */
export async function findMine(): Promise<Space[]> {
  //TODO: Return spaces from db with ownerId that is equal to users public key.

  // return test data.
  return spaces
}

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Space> {
  // TODO: Return events from db

  // return test data.
  return spaces[0]
}


/**
 * Commands
 */


export async function create(data: Space) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}

export async function update(data: Space) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}

export async function remove(id: string) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}


//TODO: Add processor