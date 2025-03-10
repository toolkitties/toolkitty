// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { CALENDAR_ID, LOG_PATH, OWNER_PUBLIC_KEY, STREAM } from "./data";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { dependencies } from "$lib/api";

beforeAll(async () => {
  mockIPC((cmd, args) => {
    if (cmd === "public_key") {
      return OWNER_PUBLIC_KEY;
    }
    if (cmd === "replay") {
      return;
    }
  });
});

describe("dependencies tests", () => {
  test("update missing calendar triggers replay", async () => {
    let updateCalendar: ApplicationMessage = {
      meta: {
        operationId: "update_calendar_001",
        author: OWNER_PUBLIC_KEY,
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
    await expect(dependencies.process(updateCalendar)).rejects.toThrowError("calendar not yet received");
  });

  test("update missing event triggers replay", async () => {
    let updateEvent: ApplicationMessage = {
      meta: {
        operationId: "update_event_001",
        author: OWNER_PUBLIC_KEY,
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

    await expect(dependencies.process(updateEvent)).rejects.toThrowError(
      "event not yet received",
    );
  });
});
