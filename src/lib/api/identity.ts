import { invoke } from "@tauri-apps/api/core";

export async function publicKey(): Promise<PublicKey> {
  // @TODO: Would be good to cache this somewhere probably.
  return await invoke("public_key");
}
