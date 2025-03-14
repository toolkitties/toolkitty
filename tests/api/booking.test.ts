// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import {
  CALENDAR_ID,
  createBookingRequestMessage,
  createEventMessage,
  LOG_PATH,
  NON_OWNER_PUBLIC_KEY,
  OWNER_PUBLIC_KEY,
  STREAM,
} from "$lib/utils/faker";
import {
  bookingRequest001End,
  event001End,
  event001Start,
  seedTestMessages,
} from "./data";
import { bookings } from "$lib/api";
import { beforeEach, expect, test } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";

beforeEach(async () => {
  mockIPC((cmd) => {
    if (cmd === "public_key") {
      return OWNER_PUBLIC_KEY;
    }
  });

  for (const message of seedTestMessages()) {
    await processMessage(message);
  }
});

test("booking queries", async () => {
  // Test data contains two pending bookings.
  let bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    status: "pending",
  });
  expect(bookingRequests).lengthOf(2);

  // And there are no accepted bookings.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    status: "accepted",
  });
  expect(bookingRequests).lengthOf(0);

  // Accept these booking requests.
  let requestResponse: ApplicationMessage = {
    meta: {
      operationId: "booking_request_response_001",
      author: OWNER_PUBLIC_KEY,
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

  // One pending booking request now for event001.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    status: "pending",
  });
  expect(bookingRequests).lengthOf(1);

  // One accepted booking for event001.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    status: "accepted",
  });
  expect(bookingRequests).lengthOf(1);

  // Accept the second booking request.
  requestResponse = {
    meta: {
      operationId: "booking_request_response_002",
      author: OWNER_PUBLIC_KEY,
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

  // No pending requests.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    status: "pending",
  });
  expect(bookingRequests).lengthOf(0);

  // Two accepted booking requests.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    status: "accepted",
  });
  expect(bookingRequests).lengthOf(2);

  // One space booking.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    resourceType: "space",
  });
  expect(bookingRequests).lengthOf(1);

  // One resource booking.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    eventId: "event_001",
    resourceType: "resource",
  });
  expect(bookingRequests).lengthOf(1);

  // Publish another request from a non calendar owner to a new event.
  const event002Start = event001Start;
  const event002End = event001End;
  const event002 = createEventMessage(
    "event_002",
    NON_OWNER_PUBLIC_KEY,
    {
      type: "event_created",
    },
    {
      startDate: event002Start.toISOString(),
      endDate: event002End.toISOString(),
    },
  );
  await processMessage(event002);

  const bookingRequest003 = createBookingRequestMessage(
    "booking_request_003",
    NON_OWNER_PUBLIC_KEY,
    "resource",
    "resource_001",
    "event_002",
    {
      start: new Date(event002Start),
      end: new Date(event002End),
    },
  );
  await processMessage(bookingRequest003);

  // Find all pending and accepted.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    status: "pending",
  });
  expect(bookingRequests).lengthOf(1);
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    status: "accepted",
  });
  expect(bookingRequests).lengthOf(2);

  // Find all by requester.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    requester: OWNER_PUBLIC_KEY,
  });
  expect(bookingRequests).lengthOf(2);
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    requester: NON_OWNER_PUBLIC_KEY,
  });
  expect(bookingRequests).lengthOf(1);

  // Find all by event.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    eventId: "event_001",
  });
  expect(bookingRequests).lengthOf(2);
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    eventId: "event_002",
  });
  expect(bookingRequests).lengthOf(1);

  // Find all by timespan.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    from: event001Start,
  });
  expect(bookingRequests).lengthOf(3);
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    from: event001End,
  });
  expect(bookingRequests).lengthOf(0);
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    from: event001Start,
    to: bookingRequest001End,
  });
  expect(bookingRequests).lengthOf(2);

  // Find all by resource type.
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    resourceType: "space",
  });
  expect(bookingRequests).lengthOf(1);
  bookingRequests = await bookings.findAll({
    calendarId: CALENDAR_ID,
    resourceType: "resource",
  });
  expect(bookingRequests).lengthOf(2);
});
