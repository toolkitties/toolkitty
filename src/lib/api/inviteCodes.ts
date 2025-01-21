import { invoke } from "@tauri-apps/api/core";
import { calendars } from "$lib/api";

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

export async function resolve(inviteCode: string): Promise<string> {
  // Get local calendars
  const calendar = await calendars.findByInviteCode(inviteCode);

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
    send(inviteCode);
    // Broadcast request every x seconds into the network, hopefully someone will answer ..
    const interval = setInterval(() => {
      send(inviteCode);
    }, SEND_INVITE_CODE_FREQUENCY);
  });
}

export async function process(message: ChannelMessage) {
  if (message.event === "invite_codes_ready") {
    // Do nothing for now
  } else if (message.event === "invite_codes") {
    if (message.data.messageType === "request") {
      respond(message.data.inviteCode);
    }

    if (message.data.messageType === "response") {
      handleResponse(message.data);
    }
  }
}

async function send(inviteCode: string) {
  const payload: ResolveInviteCodeRequest = {
    inviteCode,
    timestamp: Date.now(),
    messageType: "request",
  };

  await invoke("publish_to_invite_code_overlay", { payload });
}

async function respond(inviteCode: string) {
  const calendar = await calendars.findByInviteCode(inviteCode);
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

async function handleResponse(response: ResolveInviteCodeResponse) {
  if (pendingInviteCode.inviteCode !== response.inviteCode) {
    // Ignore this invite code response, it's not for us.
    return;
  }

  if (!pendingInviteCode.callbackFn) {
    return;
  }

  pendingInviteCode.callbackFn(response.calendarId);
}
