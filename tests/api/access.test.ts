// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import {
  CALENDAR_ID,
  LOG_PATH,
  PUBLIC_KEY,
  STREAM,
  calendarTestMessages,
} from "./data";
import { access } from "$lib/api";
import { expect, test } from "vitest";

test("process calendar access requests and responses", async () => {
  const requestingAuthor = "panda";
  for (const message of calendarTestMessages) {
    await processMessage(message);
  }

  let accessStatus = await access.checkStatus(requestingAuthor, CALENDAR_ID);
  expect(accessStatus).toBe("not requested yet");

  let requestCalendarAccess: ApplicationMessage = {
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

  let acceptCalendarAccessRequest: ApplicationMessage = {
    meta: {
      operationId: "accept_access_request_001",
      author: PUBLIC_KEY,
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

  let rejectAccessRequest: ApplicationMessage = {
    meta: {
      operationId: "reject_access_request_001",
      author: PUBLIC_KEY,
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
    for (const message of calendarTestMessages) {
      await processMessage(message);
    }
  
    const accessStatus = await access.checkStatus(PUBLIC_KEY, CALENDAR_ID);
    expect(accessStatus).toBe("accepted");
  });
  