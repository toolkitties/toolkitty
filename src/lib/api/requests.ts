import { requests } from '$lib/api/data'

/**
 * Queries
 */


/**
 * Get all requests that are pending
 */
export async function findPending(): Promise<SpaceRequest[]> {
  //TODO: Return events from db as liveQuery

  // return test data.
  return requests
}

/**
 * Get one request by its ID
 */
export async function findById(id: Hash): Promise<SpaceRequest> {
  //TODO: Return events from db

  // return test data.
  return requests[0]
}


//TODO: Add commands
//TODO: Add processor