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
import { bookings, resources, spaces } from "$lib/api";
import { beforeAll, describe, expect, test } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";

beforeAll(async () => {
  mockIPC((cmd, args) => {
    if (cmd === "public_key") {
      return OWNER_PUBLIC_KEY;
    }
  });

  for (const message of seedTestMessages()) {
    await processMessage(message);
  }
});

describe("maintain booking request timespan validity", () => {
  test("space with update and delete", async () => {
    let pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "space",
    });
    expect(pendingBookings).lengthOf(1);

    let invalidRequest: ApplicationMessage = {
      meta: {
        operationId: "booking_request_003",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "booking_requested",
        data: {
          type: "space",
          resourceId: "space_001",
          eventId: "event_001",
          message: "Hi, can I haz your Conference Room A?",
          // This timeSpan is outside the available timeSpan for space_002
          timeSpan: {
            start: new Date("2025-04-01T09:00:00Z"),
            end: new Date("2025-05-01T17:00:00Z"),
          },
        },
      },
    };

    await processMessage(invalidRequest);

    pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "space",
      isValid: "true",
    });
    expect(pendingBookings).lengthOf(1);

    let space = await spaces.findById("space_001");
    const { id, calendarId, availability, ...fields } = space!;
    let updateSpace: ApplicationMessage = {
      meta: {
        operationId: "space_updated_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "space_updated",
        data: {
          id: "space_001",
          fields: {
            availability: [
              {
                start: new Date("2025-02-01T09:00:00Z"),
                end: new Date("2025-02-01T17:00:00Z"),
              },
            ],
            ...fields,
          },
        },
      },
    };

    await processMessage(updateSpace);

    pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "space",
      isValid: "true",
    });
    expect(pendingBookings).lengthOf(0);

    updateSpace = {
      meta: {
        operationId: "space_updated_002",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "space_updated",
        data: {
          id: "space_001",
          fields: {
            availability: "always",
            ...fields,
          },
        },
      },
    };

    await processMessage(updateSpace);

    pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "space",
      isValid: "true",
    });
    expect(pendingBookings).lengthOf(2);

    const deleteSpace: ApplicationMessage = {
      meta: {
        operationId: "space_deleted_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "space_deleted",
        data: {
          id: "space_001",
        },
      },
    };

    await processMessage(deleteSpace);

    pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "space",
      isValid: "true",
    });
    expect(pendingBookings).lengthOf(0);
  });

  test("resource with update and delete", async () => {
    let pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "resource",
    });
    expect(pendingBookings).lengthOf(1);

    let invalidRequest: ApplicationMessage = {
      meta: {
        operationId: "resource_request_004",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "booking_requested",
        data: {
          type: "resource",
          resourceId: "resource_001",
          eventId: "event_001",
          message: "Hi, can I haz your Projector?",
          // The resource is "always" available so all timespans are "valid"
          timeSpan: {
            start: new Date("2025-04-01T09:00:00Z"),
            end: new Date("2025-05-01T17:00:00Z"),
          },
        },
      },
    };

    await processMessage(invalidRequest);

    pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "resource",
      isValid: "true",
    });
    expect(pendingBookings).lengthOf(2);

    let resource = await resources.findById("resource_001");
    const { id, calendarId, availability, ...fields } = resource!;
    let updateResource: ApplicationMessage = {
      meta: {
        operationId: "resource_updated_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "resource_updated",
        data: {
          id: "resource_001",
          fields: {
            availability: [
              {
                start: new Date("2025-02-01T09:00:00Z"),
                end: new Date("2025-02-01T17:00:00Z"),
              },
            ],
            ...fields,
          },
        },
      },
    };

    await processMessage(updateResource);

    pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "resource",
      isValid: "true",
    });
    expect(pendingBookings).lengthOf(0);

    updateResource = {
      meta: {
        operationId: "resource_updated_002",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "resource_updated",
        data: {
          id: "resource_001",
          fields: {
            availability: "always",
            ...fields,
          },
        },
      },
    };

    await processMessage(updateResource);

    pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "resource",
      isValid: "true",
    });
    expect(pendingBookings).lengthOf(2);

    const deleteSpace: ApplicationMessage = {
      meta: {
        operationId: "resource_deleted_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "resource_deleted",
        data: {
          id: "resource_001",
        },
      },
    };

    await processMessage(deleteSpace);

    pendingBookings = await bookings.findPending(CALENDAR_ID, {
      eventId: "event_001",
      resourceType: "resource",
      isValid: "true",
    });
    expect(pendingBookings).lengthOf(0);
  });
});
