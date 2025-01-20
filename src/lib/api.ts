import { invoke } from "@tauri-apps/api/core";
import { Calendar, calendars } from "$lib/state.svelte";

const RESOLVE_INVITE_CODE_TIMEOUT = 1000 * 30;
const SEND_INVITE_CODE_FREQUENCY = 1000 * 5;

type InviteCodeState = {
  inviteCode: string | null;
  callbackFn: null | ((calendarId: string) => void);
};

const pendingInviteCode: InviteCodeState = {
  inviteCode: null,
  callbackFn: null,
};

export async function resolveInviteCode(inviteCode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Clear up state and throw an error if we've waited for too long without any answer.
    const timeout = setTimeout(() => {
      pendingInviteCode.inviteCode = null;
      pendingInviteCode.callbackFn = null;
      reject("couldn't resolve invite code within given time");
    }, RESOLVE_INVITE_CODE_TIMEOUT);

    // Prepare callback for awaiting a response coming from the channel.
    pendingInviteCode.inviteCode = inviteCode;
    pendingInviteCode.callbackFn = (calendarId: string) => {
      clearTimeout(timeout);
      resolve(calendarId);
    };

    // Broadcast request every x seconds into the network, hopefully someone will answer ..
    setInterval(() => {
      sendResolveInviteCodeRequest(inviteCode);
    }, SEND_INVITE_CODE_FREQUENCY);
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
  if (!calendar) {
    // We can't answer this request, ignore it.
    return;
  }

  const payload: ResolveInviteCodeResponse = {
    calendarId: calendar.id,
    inviteCode,
    timestamp: Date.now(),
    messageType: "response",
  };
  await invoke("publish_to_invite_code_overlay", { payload });
}

export async function handleInviteCodeResponse(
  response: ResolveInviteCodeResponse
) {
  if (pendingInviteCode.inviteCode !== response.inviteCode) {
    // Ignore this invite code response, it's not for us.
    return;
  }

  if (!pendingInviteCode.callbackFn) {
    return;
  }

  pendingInviteCode.callbackFn(response.calendarId);
}

export async function createCalendar(payload: any): Promise<Calendar> {
  let hash: string, calendar: Calendar;
  [hash, calendar] = await invoke("create_calendar", { payload });

  // @TODO: If I don't construct the calendar here then it's class methods are undefined, I
  // thought just inferring the type above would be enough for that.... Is there a better way to
  // do this?
  calendar = new Calendar(calendar.id, calendar.owner, calendar.created_at);
  console.log("calendar created: ", calendar);

  calendars.addCalendar(calendar);
  return calendar;
}
