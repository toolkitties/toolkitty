import { invoke } from "@tauri-apps/api/core";
import { calendars } from "$lib/api";

type InviteCodesState = {
  inviteCode: string | null;
  onResolved: null | ((resolved: ResolvedCalendar) => void);
};

type ResolvedCalendar = {
  id: Hash;
  name: string;
};

const RESOLVE_TIMEOUT_MS = 1000 * 30;
const SEND_FREQUENCY_MS = 1000 * 5;

const pendingInviteCode: InviteCodesState = {
  inviteCode: null,
  onResolved: null,
};

/*
 * Commands
 */

export async function resolve(inviteCode: string): Promise<ResolvedCalendar> {
  // Get local calendars
  const calendar = await calendars.findByInviteCode(inviteCode);

  // Check if we already have calendar locally and return before broadcasting
  if (calendar) {
    return {
      id: calendar.id,
      name: calendar.name,
    };
  }

  return new Promise((resolve, reject) => {
    // Clear up state and throw an error if we've waited for too long without
    // any answer.
    const timeout = setTimeout(() => {
      reset();
      clearInterval(interval);
      reject("couldn't resolve invite code within given time");
    }, RESOLVE_TIMEOUT_MS);

    // Prepare callback for awaiting a response coming from the channel.
    pendingInviteCode.inviteCode = inviteCode;
    pendingInviteCode.onResolved = (calendar) => {
      reset();
      clearTimeout(timeout);
      clearInterval(interval);
      resolve(calendar);
    };

    // Initial request to network
    sendRequest(inviteCode);
    // Broadcast request every x seconds into the network, hopefully someone
    // will answer ..
    const interval = setInterval(() => {
      sendRequest(inviteCode);
    }, SEND_FREQUENCY_MS);
  });
}

function reset() {
  pendingInviteCode.inviteCode = null;
  pendingInviteCode.onResolved = null;
}

async function sendRequest(inviteCode: string) {
  const payload: ResolveInviteCodeRequest = {
    messageType: "request",
    timestamp: Date.now(),
    inviteCode,
  };

  await invoke("publish_to_invite_code_overlay", { payload });
}

/*
 * Processor
 */

export async function process(
  message: InviteCodesReadyMessage | InviteCodesMessage,
) {
  if (message.event === "invite_codes_ready") {
    // Do nothing for now
  } else if (message.event === "invite_codes") {
    if (message.data.messageType === "request") {
      onRequest(message.data.inviteCode);
    } else if (message.data.messageType === "response") {
      onResponse(message.data);
    }
  }
}

async function onRequest(inviteCode: string) {
  const calendar = await calendars.findByInviteCode(inviteCode);
  if (!calendar) {
    // We can't answer this request, ignore it.
    return;
  }

  const payload: ResolveInviteCodeResponse = {
    messageType: "response",
    timestamp: Date.now(),
    inviteCode,
    calendarId: calendar.id,
    calendarName: calendar.name,
  };
  await invoke("publish_to_invite_code_overlay", { payload });
}

async function onResponse(response: ResolveInviteCodeResponse) {
  if (pendingInviteCode.inviteCode !== response.inviteCode) {
    // Ignore this invite code response, it's not for us.
    return;
  }

  if (!pendingInviteCode.onResolved) {
    // Ignore, we're not looking for one right now.
    return;
  }

  pendingInviteCode.onResolved({
    id: response.calendarId,
    name: response.calendarName,
  });
}
