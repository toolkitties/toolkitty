import { invoke } from "@tauri-apps/api/core";

export async function publicKey(): Promise<PublicKey> {
  return await invoke("public_key");
}
