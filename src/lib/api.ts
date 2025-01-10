import { invoke } from "@tauri-apps/api/core";
import { calendars } from "$lib/state.svelte";

type InviteCodeState = {
  inviteCode: string | null;
  callbackFn: null | ((calendarId: string) => void);
};

const pendingInviteCode: InviteCodeState = {
  inviteCode: null,
  callbackFn: null,
};

const RESOLVE_INVITE_CODE_TIMEOUT = 1000 * 30;

export async function resolveInviteCode(inviteCode: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingInviteCode.inviteCode = null;
      pendingInviteCode.callbackFn = null;
      reject();
    }, RESOLVE_INVITE_CODE_TIMEOUT);

    pendingInviteCode.inviteCode = inviteCode;
    pendingInviteCode.callbackFn = (calendarId: string) => {
      clearTimeout(timeout);
      resolve(calendarId);
    };

    await sendResolveInviteCodeRequest(inviteCode);
  });
}

export async function sendResolveInviteCodeRequest(inviteCode: string) {
  const payload: ResolveInviteCodeRequest = {
    inviteCode,
    timestamp: Date.now(),
    messageType: "request",
  };

  await invoke("publish_to_invite_code_overlay", { payload });
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
    await invoke("publish_to_invite_code_overlay", { payload });
  }
}

export async function handleInviteCodeResponse(response: ResolveInviteCodeResponse) {
  if (pendingInviteCode.inviteCode !== response.inviteCode) {
    // Ignore this invite code response, it's not for us.
    return;
  }

  if (!pendingInviteCode.callbackFn) {
    return;
  }

  pendingInviteCode.callbackFn(response.calendarId);
}
