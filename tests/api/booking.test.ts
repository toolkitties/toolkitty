// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import { LOG_PATH, PUBLIC_KEY, STREAM, bookingTestMessages } from "./data";
import { bookings } from "$lib/api";
import { expect, test } from "vitest";
import { db } from "$lib/db";

test("processes resource request and response messages", async () => {
  for (const message of bookingTestMessages) {
    await processMessage(message);
  }

  let pendingBookings = await bookings.findPendingForEvent("event_001");
  expect(pendingBookings).lengthOf(2);

  let requestResponse: ApplicationMessage = {
    meta: {
      operationId: "resource_request_response_001",
      author: PUBLIC_KEY,
      stream: STREAM,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "resource_request_accepted",
      data: {
        requestId: "resource_request_001",
      },
    },
  };

  await processMessage(requestResponse);

  pendingBookings = await bookings.findPendingForEvent("event_001");
  expect(pendingBookings).lengthOf(1);

  requestResponse = {
    meta: {
      operationId: "resource_request_response_002",
      author: PUBLIC_KEY,
      stream: STREAM,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "resource_request_accepted",
      data: {
        requestId: "resource_request_002",
      },
    },
  };

  await processMessage(requestResponse);

  pendingBookings = await bookings.findPendingForEvent("event_001");
  expect(pendingBookings).lengthOf(0);
});
