import { resources } from '$lib/api/data'

/**
 * Queries
 */


/**
 * Get all requests that are pending and associated with user public key
 */
export async function findPending(): Promise<Resource[]> {
  //TODO: Return events from db as liveQuery

  // return test data.
  return resources
}

/**
 * Get one request by its ID
 */
export async function findById(id: Hash): Promise<Resource> {
  //TODO: Return events from db

  // return test data.
  return resources[0]
}


//TODO: Add commands
//TODO: Add processor