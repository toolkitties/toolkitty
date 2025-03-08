// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import {
  CALENDAR_ID,
  LOG_PATH,
  PUBLIC_KEY,
  STREAM,
  bookingTestMessages,
} from "./data";
import { bookings } from "$lib/api";
import { beforeAll, expect, test } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";

beforeAll(async () => {
  mockIPC((cmd, args) => {
    if (cmd === "public_key") {
      return PUBLIC_KEY;
    }
  });

  for (const message of bookingTestMessages) {
    await processMessage(message);
  }
});

// @TODO: this test fails as bookings.findPending now returns an observable.
test("processes resource request and response messages", async () => {
  let pendingBookings = await bookings.findPending(CALENDAR_ID, {
    eventId: "event_001",
  });
  expect(pendingBookings).lengthOf(2);
  pendingBookings = await bookings.findPending(CALENDAR_ID, {
    requester: PUBLIC_KEY,
  });
  expect(pendingBookings).lengthOf(2);

  let requestResponse: ApplicationMessage = {
    meta: {
      operationId: "booking_request_response_001",
      author: PUBLIC_KEY,
      stream: STREAM,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "booking_request_accepted",
      data: {
        requestId: "booking_request_001",
      },
    },
  };

  await processMessage(requestResponse);

  pendingBookings = await bookings.findPending(CALENDAR_ID, {
    eventId: "event_001",
  });
  expect(pendingBookings).lengthOf(1);
  pendingBookings = await bookings.findPending(CALENDAR_ID, {
    requester: PUBLIC_KEY,
  });
  expect(pendingBookings).lengthOf(1);

  requestResponse = {
    meta: {
      operationId: "booking_request_response_002",
      author: PUBLIC_KEY,
      stream: STREAM,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "booking_request_accepted",
      data: {
        requestId: "booking_request_002",
      },
    },
  };

  await processMessage(requestResponse);

  pendingBookings = await bookings.findPending(CALENDAR_ID, {
    eventId: "event_001",
  });
  expect(pendingBookings).lengthOf(0);
  pendingBookings = await bookings.findPending(CALENDAR_ID, {
    requester: PUBLIC_KEY,
  });
  expect(pendingBookings).lengthOf(0);

  let allRequests = await bookings.findAll(CALENDAR_ID, {
    eventId: "event_001",
  });
  expect(allRequests).lengthOf(2);
  let spaceRequests = await bookings.findAll(CALENDAR_ID, {
    eventId: "event_001",
    resourceType: "space",
  });
  expect(spaceRequests).lengthOf(1);
  let resourceRequests = await bookings.findAll(CALENDAR_ID, {
    eventId: "event_001",
    resourceType: "resource",
  });
  expect(resourceRequests).lengthOf(1);

  allRequests = await bookings.findAll(CALENDAR_ID, {
    requester: PUBLIC_KEY,
  });
  expect(allRequests).lengthOf(2);
  spaceRequests = await bookings.findAll(CALENDAR_ID, {
    requester: PUBLIC_KEY,
    resourceType: "space",
  });
  expect(spaceRequests).lengthOf(1);
  resourceRequests = await bookings.findAll(CALENDAR_ID, {
    requester: PUBLIC_KEY,
    resourceType: "resource",
  });
  expect(resourceRequests).lengthOf(1);
});
