// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import { CALENDAR_ID, bookingTestMessages } from "./data";
import { bookings, calendars } from "$lib/api";
import { expect, test } from "vitest";
import { db } from "$lib/db";

test("processes resource request and response messages", async () => {
  for (const message of bookingTestMessages) {

    if (message.event == "application" && message.data.type == "resource_request_accepted") {
        const pendingBookings = await bookings.findPendingForEvent("event_001");
        expect(pendingBookings).lengthOf(1);
    }

    await processMessage(message);
  }

  const response = await db.responses.get("resource_request_response_001");
  expect(response).not.toBe(undefined);
  const pendingBookings = await bookings.findPendingForEvent("event_001");
  expect(pendingBookings).lengthOf(0);
});
