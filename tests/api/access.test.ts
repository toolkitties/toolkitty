// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import {
  CALENDAR_ID,
  LOG_PATH,
  OWNER_PUBLIC_KEY,
  STREAM,
  seedTestMessages,
} from "./data";
import { access } from "$lib/api";
import {
  beforeAll,
  describe,
  expect,
  test,
} from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";

beforeAll(async () => {
  mockIPC((cmd) => {
    if (cmd === "public_key") {
      return OWNER_PUBLIC_KEY;
    }
  });

  for (const message of seedTestMessages()) {
    await processMessage(message);
  }
});

describe("access tests", () => {
  test("process calendar access requests and responses", async () => {
    const requestingAuthor = "panda";

    let accessStatus = await access.checkStatus(requestingAuthor, CALENDAR_ID);
    expect(accessStatus).toBe("not requested yet");

    const requestCalendarAccess: ApplicationMessage = {
      meta: {
        operationId: "access_request_001",
        author: requestingAuthor,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "calendar_access_requested",
        data: {
          calendarId: CALENDAR_ID,
          name: "panda",
          message: "Can I haz access?",
        },
      },
    };

    await processMessage(requestCalendarAccess);

    accessStatus = await access.checkStatus(requestingAuthor, CALENDAR_ID);
    expect(accessStatus).toBe("pending");

    const acceptCalendarAccessRequest: ApplicationMessage = {
      meta: {
        operationId: "accept_access_request_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "calendar_access_accepted",
        data: {
          requestId: "access_request_001",
        },
      },
    };

    await processMessage(acceptCalendarAccessRequest);

    accessStatus = await access.checkStatus(requestingAuthor, CALENDAR_ID);
    expect(accessStatus).toBe("accepted");

    const rejectAccessRequest: ApplicationMessage = {
      meta: {
        operationId: "reject_access_request_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "calendar_access_rejected",
        data: {
          requestId: "access_request_001",
        },
      },
    };

    await processMessage(rejectAccessRequest);

    accessStatus = await access.checkStatus(requestingAuthor, CALENDAR_ID);
    expect(accessStatus).toBe("rejected");
  });

  test("calendar owner has access", async () => {
    const accessStatus = await access.checkStatus(
      OWNER_PUBLIC_KEY,
      CALENDAR_ID,
    );
    expect(accessStatus).toBe("accepted");
  });
});
