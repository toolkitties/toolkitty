import { invoke } from "@tauri-apps/api/core";

/**
 * Invokes a file selector in the backend and imports the selected file into
 * local blob store.
 *
 * If a file was selected by the user, it will be processed by the backend and
 * the resulting hash will be returned here. This "blob hash" is now the unique
 * identifier of the uploaded file and it can be used to display images with
 * the `blobstore://` URI scheme, for example like that:
 *
 * ```
 * <img src="blobstore://<hash>" />
 * ```
 *
 * Make sure to check the Tauri CSP settings if you intend to use the blobstore
 * scheme in other contexts as well.
 */
export async function uploadFile(): Promise<Hash> {
  const blobHash = await invoke("upload_file");
  return blobHash as Hash;
}
