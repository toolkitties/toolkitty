import { resources } from '$lib/api/data'

/**
 * Queries
 */


/**
 * Get resources that are associated with the currently active calendar
 */
export async function findMany(): Promise<Resource[]> {
  //TODO: Return resources from db as liveQuery and add params

  // return test data.
  return resources
}

/**
 * Get all resources that I am the owner of.
 */
export async function findMine(): Promise<Resource[]> {
  //TODO: Return resources from db with ownerId that is equal to users public key.

  // return test data.
  return resources
}

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Resource> {
  //TODO: Return events from db

  // return test data.
  return resources[0]
}


/**
 * Commands
 */


export async function create(data: Resource) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}

export async function update(data: Resource) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}

async function deleteResource(id: Hash) {
  //TODO: send to backend for processing, add to promise map and await.

  // for now we are just returning a hash.
  return '123';
}

//TODO: Move to class so we don't have to export as an alias
export { deleteResource as delete };


//TODO: Add processor