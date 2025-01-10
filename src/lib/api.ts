import { invoke } from "@tauri-apps/api/core";

type ResolveInviteCodeRequest = {
  inviteCode: string;
  timestamp: number;
};

export async function resolveInviteCode(inviteCode: string) {
  const payload: ResolveInviteCodeRequest = {
    inviteCode,
    timestamp: Date.now(),
  };

  await invoke("respond_to_invite_code", { payload });
}

