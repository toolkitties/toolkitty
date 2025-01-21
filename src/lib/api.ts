import { invoke } from "@tauri-apps/api/core";
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


function getInviteCode(calendar: Calendar) {
  return calendar.id.slice(0, 4);
}

export async function getCalendars(): Promise<Calendar[]> {
  return await db.calendars.toArray();
}

export async function findCalendarByInviteCode(inviteCode: string): Promise<undefined | Calendar> {
  const calendars = await getCalendars();
  return calendars.find((calendar) => {
    return getInviteCode(calendar) === inviteCode;
  });
}

export async function addCalendar(calendar: Calendar) {
  await db.calendars.add(calendar);
}


export async function addEvent(calEvent: CalendarEvent) {
  await db.events.add(calEvent);
}