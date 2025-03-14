// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import {
  CALENDAR_ID,
  LOG_PATH,
  OWNER_PUBLIC_KEY,
  STREAM,
} from "$lib/utils/faker";
import { beforeAll, describe, expect, test } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import { dependencies } from "$lib/api";
import {
  createCalendarFields,
  createEventFields,
} from "../../src/lib/utils/faker";

beforeAll(async () => {
  mockIPC((cmd) => {
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
    const updateCalendar: ApplicationMessage = {
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
          fields: createCalendarFields(),
        },
      },
    };
    await expect(dependencies.process(updateCalendar)).rejects.toThrowError(
      "calendar not yet received",
    );
  });

  test("update missing event triggers replay", async () => {
    const updateEvent: ApplicationMessage = {
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
          fields: createEventFields(),
        },
      },
    };

    await expect(dependencies.process(updateEvent)).rejects.toThrowError(
      "event not yet received",
    );
  });
});
