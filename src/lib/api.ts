import { invoke } from "@tauri-apps/api/core";
import { calendars } from "$lib/state.svelte";

export async function sendResolveInviteCodeRequest(inviteCode: string) {
  const payload: ResolveInviteCodeRequest = {
    inviteCode,
    timestamp: Date.now(),
    messageType: "request",
  };

  await invoke("respond_to_invite_code", { payload });
}

export async function respondInviteCodeRequest(inviteCode: string) {
  const calendar = calendars.findCalendarByInviteCode(inviteCode);
  if (calendar) {
    const payload: ResolveInviteCodeResponse = {
      calendarId: calendar.id,
      inviteCode,
      timestamp: Date.now(),
      messageType: "response",
    };
    await invoke("respond_to_invite_code", { payload });
  }
}
