// import { requests } from '$lib/api/data'

/**
 * Queries
 */

/**
 * Get all requests that are pending
 */
export async function findPending(): Promise<SpaceRequest[]> {
  //TODO: Return events from db as liveQuery

  // return test data.
  return [];
}

/**
 * Get one request by its ID
 */
export async function findById(id: Hash): Promise<SpaceRequest | undefined> {
  //TODO: Return events from db

  // return test data.
  return;
}

//TODO: Add commands
//TODO: Add processor
