import { spaces } from "$lib/api/data";
import { invoke } from "@tauri-apps/api/core";

/**
 * Queries
 */

/**
 * Get spaces that are associated with the currently active calendar
 */
export async function findMany(): Promise<Space[]> {
  //TODO: Return spaces from db as liveQuery and add params

  // return test data.
  return spaces;
}

/**
 * Get all spaces that I am the owner of.
 */
export async function findMine(): Promise<Space[]> {
  //TODO: Return spaces from db with ownerId that is equal to users public key.

  // return test data.
  return spaces;
}

/**
 * Get one event by its ID
 */
export async function findById(id: Hash): Promise<Space> {
  // TODO: Return events from db

  // return test data.
  return spaces[0];
}

/**
 * Commands
 */

export async function create(
  calendar_id: Hash,
  fields: SpaceFields,
): Promise<Hash> {
  let space_created: SpaceCreated = {
    type: "space_created",
    data: {
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: space_created,
  });
  return hash;
}

export async function update(
  calendar_id: Hash,
  space_id: Hash,
  fields: SpaceFields,
): Promise<Hash> {
  let space_updated: SpaceUpdated = {
    type: "space_updated",
    data: {
      id: space_id,
      fields,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: space_updated,
  });
  return hash;
}

export async function deleteSpace(
  calendar_id: Hash,
  space_id: Hash,
): Promise<Hash> {
  let space_deleted: SpaceDeleted = {
    type: "space_deleted",
    data: {
      id: space_id,
    },
  };
  let hash: Hash = await invoke("publish", {
    calendar_id,
    payload: space_deleted,
  });
  return hash;
}

//TODO: Move to class so we don't have to export as an alias
export { deleteSpace as delete };

//TODO: Add processor
