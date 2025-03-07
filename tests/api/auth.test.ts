// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import {
  CALENDAR_ID,
  seedTestMessages,
  PUBLIC_KEY,
  STREAM,
  LOG_PATH,
} from "./data";
import { auth, calendars, users } from "$lib/api";
import { beforeAll, describe, expect, test } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { db } from "$lib/db";

const PUBLIC_KEY_NO_AUTH: string = "naughtyPanda";

beforeAll(async () => {
  mockIPC((cmd, args) => {
    if (cmd === "public_key") {
      return PUBLIC_KEY;
    }
  });

  for (const message of seedTestMessages) {
    await processMessage(message);
  }
});

describe("owners can perform updates", () => {
  test("update calendar", async () => {
    let updateCalendar: ApplicationMessage = {
      meta: {
        operationId: "update_calendar_001",
        author: PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "calendar_updated",
        data: {
          id: CALENDAR_ID,
          fields: {
            name: "New calendar name",
            dates: [
              {
                start: new Date("2025-03-01T09:00:00Z"),
                end: new Date("2025-03-01T17:00:00Z"),
              },
            ],
            festivalInstructions: null,
            spacePageText: null,
            resourcePageText: null,
          },
        },
      },
    };

    await expect(auth.process(updateCalendar)).resolves.toEqual(undefined);
  });

  test("update event", async () => {
    let updateEvent: ApplicationMessage = {
      meta: {
        operationId: "update_event_001",
        author: PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "event_updated",
        data: {
          id: CALENDAR_ID,
          fields: {
            name: "Better name",
            description: "Monthly team meeting to discuss project updates.",
            location: "space_001",
            startDate: new Date("2025-03-05T10:00:00Z"),
            endDate: new Date("2025-03-05T11:00:00Z"),
            resources: ["resource_001"],
            links: [
              {
                type: "custom",
                title: "Meeting Agenda",
                url: "https://example.com/agenda",
              },
            ],
            images: [],
          },
        },
      },
    };

    await expect(auth.process(updateEvent)).resolves.toEqual(undefined);
  });
});

describe("non-owners cannot perform updates", () => {
  test("update calendar", async () => {
    let updateCalendar: ApplicationMessage = {
      meta: {
        operationId: "update_calendar_001",
        author: PUBLIC_KEY_NO_AUTH,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "calendar_updated",
        data: {
          id: CALENDAR_ID,
          fields: {
            name: "New calendar name",
            dates: [
              {
                start: new Date("2025-03-01T09:00:00Z"),
                end: new Date("2025-03-01T17:00:00Z"),
              },
            ],
            festivalInstructions: null,
            spacePageText: null,
            resourcePageText: null,
          },
        },
      },
    };

    await expect(auth.process(updateCalendar)).rejects.toThrowError(
      "author does not have permission to update or delete this calendar",
    );
  });

  test("update event", async () => {
    let updateEvent: ApplicationMessage = {
      meta: {
        operationId: "update_event_001",
        author: PUBLIC_KEY_NO_AUTH,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "event_updated",
        data: {
          id: "event_001",
          fields: {
            name: "Better name",
            description: "Monthly team meeting to discuss project updates.",
            location: "space_001",
            startDate: new Date("2025-03-05T10:00:00Z"),
            endDate: new Date("2025-03-05T11:00:00Z"),
            resources: ["resource_001"],
            links: [
              {
                type: "custom",
                title: "Meeting Agenda",
                url: "https://example.com/agenda",
              },
            ],
            images: [],
          },
        },
      },
    };

    await expect(auth.process(updateEvent)).rejects.toThrowError(
      "author does not have permission to update or delete this event",
    );
  });
});

describe("admin can update things too", () => {
  beforeAll(async () => {
    let assignAdminRole: ApplicationMessage = {
      meta: {
        operationId: "assign_user_role_001",
        author: PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "user_role_assigned",
        data: { publicKey: PUBLIC_KEY_NO_AUTH, role: "admin" },
      },
    };
    await users.create(CALENDAR_ID, PUBLIC_KEY_NO_AUTH, "panda");
    await processMessage(assignAdminRole);
  });

  test("update calendar", async () => {
    // User should already exist in the database.
    const user = await users.get(CALENDAR_ID, PUBLIC_KEY_NO_AUTH);
    expect(user?.role).toBe("admin");

    let updateCalendar: ApplicationMessage = {
      meta: {
        operationId: "update_calendar_001",
        author: PUBLIC_KEY_NO_AUTH,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "calendar_updated",
        data: {
          id: CALENDAR_ID,
          fields: {
            name: "New calendar name",
            dates: [
              {
                start: new Date("2025-03-01T09:00:00Z"),
                end: new Date("2025-03-01T17:00:00Z"),
              },
            ],
            festivalInstructions: null,
            spacePageText: null,
            resourcePageText: null,
          },
        },
      },
    };

    await expect(auth.process(updateCalendar)).resolves.toEqual(undefined);
  });

  test("update event", async () => {
    // User should already exist in the database.
    const user = await users.get(CALENDAR_ID, PUBLIC_KEY_NO_AUTH);
    expect(user?.role).toBe("admin");

    let updateEvent: ApplicationMessage = {
      meta: {
        operationId: "update_event_001",
        author: PUBLIC_KEY_NO_AUTH,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "event_updated",
        data: {
          id: CALENDAR_ID,
          fields: {
            name: "Better name",
            description: "Monthly team meeting to discuss project updates.",
            location: "space_001",
            startDate: new Date("2025-03-05T10:00:00Z"),
            endDate: new Date("2025-03-05T11:00:00Z"),
            resources: ["resource_001"],
            links: [
              {
                type: "custom",
                title: "Meeting Agenda",
                url: "https://example.com/agenda",
              },
            ],
            images: [],
          },
        },
      },
    };

    await expect(auth.process(updateEvent)).resolves.toEqual(undefined);
  });
});
