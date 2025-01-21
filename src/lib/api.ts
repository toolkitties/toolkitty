import { invoke } from "@tauri-apps/api/core";
import { addPromise } from "./promiseMap";
import { db } from "$lib/db";

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
  // Get local calendars
  const calendar = await findCalendarByInviteCode(inviteCode);

  // Check if we already have calendar locally and return before broadcasting
  if (calendar) {
    return calendar.id;
  }

  return new Promise((resolve, reject) => {
    // Clear up state and throw an error if we've waited for too long without any answer.
    const timeout = setTimeout(() => {
      pendingInviteCode.inviteCode = null;
      pendingInviteCode.callbackFn = null;
      clearInterval(interval);
      reject("couldn't resolve invite code within given time");
    }, RESOLVE_INVITE_CODE_TIMEOUT);

    // Prepare callback for awaiting a response coming from the channel.
    pendingInviteCode.inviteCode = inviteCode;
    pendingInviteCode.callbackFn = (calendarId: string) => {
      clearTimeout(timeout);
      clearInterval(interval);
      resolve(calendarId);
    };

    // Initial request to network
    sendResolveInviteCodeRequest(inviteCode);
    // Broadcast request every x seconds into the network, hopefully someone will answer ..
    const interval = setInterval(() => {
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
  const calendar = await findCalendarByInviteCode(inviteCode);
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

export async function createCalendar(payload: any): Promise<string> {
  // @TODO: Currently subscribing and selecting the calendar occurs on the backend when this
  // method is called. It would be more transparent, avoiding hidden side-effects, if this could
  // happen on the frontend with follow-up IPC calls. This can be refactored when
  // https://github.com/toolkitties/toolkitty/issues/69 is implemented.
  let hash: string = await invoke("create_calendar", { payload });
  addCalendar({ id: hash, name: null });

  // Register this operation in the promise map.
  let ready = addPromise(hash);

  // Wait for the promise to be resolved.
  await ready;

  return hash;
}

export async function subscribeToCalendar(calendarId: string): Promise<void> {
  await invoke("subscribe_to_calendar", { calendarId });
  addCalendar({ id: calendarId, name: null });
}

export async function selectCalendar(calendarId: string): Promise<void> {
  await invoke("select_calendar", { calendarId });
}

function getInviteCode(calendar: Calendar) {
  return calendar.id.slice(0, 4);
}

export async function getCalendars(): Promise<Calendar[]> {
  return await db.calendars.toArray();
}

export async function findCalendarByInviteCode(
  inviteCode: string
): Promise<undefined | Calendar> {
  const calendars = await getCalendars();
  return calendars.find((calendar) => {
    return getInviteCode(calendar) === inviteCode;
  });
}

export async function findCalendar(
  calendarId: string
): Promise<undefined | Calendar> {
  const calendars = await getCalendars();
  return calendars.find((calendar) => {
    return calendar.id === calendarId;
  });
}

export async function addCalendar(calendar: Calendar) {
  if (!findCalendar(calendar.id)) {
    await db.calendars.add(calendar);
  }
}

export async function updateCalendar(calendar: Calendar) {
    // @TODO: Update calendar.
}

export async function addEvent(calEvent: CalendarEvent) {
  await db.events.add(calEvent);
}

export async function setSelectedCalendar(calendarId: string) {
  // @TODO: Set selected calendar.
  return;
}
