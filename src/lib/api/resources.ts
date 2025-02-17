import { resources } from "$lib/api/data";
import { invoke } from "@tauri-apps/api/core";

/**
 * Queries
 */

/**
 * Get resources that are associated with the currently active calendar
 */
export async function findMany(): Promise<Resource[]> {
  //TODO: Return resources from db as liveQuery and add params

  // return test data.
  return resources;
}

/**
 * Get all resources that I am the owner of.
 */
export async function findMine(): Promise<Resource[]> {
  //TODO: Return resources from db with ownerId that is equal to users public key.

  // return test data.
  return resources;
}

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Resource> {
  //TODO: Return events from db

  // return test data.
  return resources[0];
}

/**
 * Commands
 */

export async function create(
  calendar_id: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  let resource_created: ResourceCreated = {
    type: "resource_created",
    data: {
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: resource_created,
  });
  return hash;
}

export async function update(
  calendar_id: Hash,
  resource_id: Hash,
  fields: ResourceFields,
): Promise<Hash> {
  let resource_updated: ResourceUpdated = {
    type: "resource_updated",
    data: {
      id: resource_id,
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: resource_updated,
  });
  return hash;
}

export async function deleteResource(
  calendar_id: Hash,
  resource_id: Hash,
): Promise<Hash> {
  let resource_deleted: ResourceDeleted = {
    type: "resource_deleted",
    data: {
      id: resource_id,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: resource_deleted,
  });
  return hash;
}

//TODO: Move to class so we don't have to export as an alias
export { deleteResource as delete };

//TODO: Add processor
