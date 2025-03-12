import { invoke } from "@tauri-apps/api/core";
import { db } from "$lib/db";

export async function publicKey(): Promise<PublicKey> {
  try {
    const cachedPublicKey = await db.settings
      .get("publicKey")
      .then((publicKey) => publicKey?.value);
    if (cachedPublicKey) {
      return cachedPublicKey;
    }

    const newPublicKey: PublicKey = await invoke("public_key");
    if (!newPublicKey) {
      throw new Error("Failed to retrieve new public key from backend");
    }

    await db.settings.put({
      name: "publicKey",
      value: newPublicKey,
    });

    return newPublicKey;
  } catch (error) {
    throw new Error(`Failed to retrieve public key: ${error}`);
  }
}
