// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import {
  CALENDAR_ID,
  seedTestMessages,
  OWNER_PUBLIC_KEY,
  NON_OWNER_PUBLIC_KEY,
  STREAM,
  LOG_PATH,
} from "./data";
import { auth, users } from "$lib/api";
import { beforeAll, describe, expect, test } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";
import {
  createCalendarFields,
  createEventFields,
  createResourceFields,
  createSpaceFields,
} from "./faker";

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

describe("owners can perform updates", () => {
  test("update calendar", async () => {
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

    await expect(auth.process(updateCalendar)).resolves.toEqual(undefined);
  });

  test("update event", async () => {
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

    await expect(auth.process(updateEvent)).resolves.toEqual(undefined);
  });

  test("update resource", async () => {
    const updateResource: ApplicationMessage = {
      meta: {
        operationId: "update_resource_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "resource_updated",
        data: {
          id: "resource_001",
          fields: createResourceFields(),
        },
      },
    };

    await expect(auth.process(updateResource)).resolves.toEqual(undefined);
  });

  test("update space", async () => {
    const updateSpace: ApplicationMessage = {
      meta: {
        operationId: "update_space_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "space_updated",
        data: {
          id: "space_001",
          fields: createSpaceFields(),
        },
      },
    };

    await expect(auth.process(updateSpace)).resolves.toEqual(undefined);
  });
});

describe("non-owners cannot perform updates", () => {
  test("update calendar", async () => {
    const updateCalendar: ApplicationMessage = {
      meta: {
        operationId: "update_calendar_001",
        author: NON_OWNER_PUBLIC_KEY,
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
            calendarInstructions: null,
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
    const updateEvent: ApplicationMessage = {
      meta: {
        operationId: "update_event_001",
        author: NON_OWNER_PUBLIC_KEY,
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

    await expect(auth.process(updateEvent)).rejects.toThrowError(
      "author does not have permission to update or delete this event",
    );
  });

  test("update resource", async () => {
    const updateResource: ApplicationMessage = {
      meta: {
        operationId: "update_resource_001",
        author: NON_OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "resource_updated",
        data: {
          id: "resource_001",
          fields: createResourceFields(),
        },
      },
    };

    await expect(auth.process(updateResource)).rejects.toThrowError(
      "author does not have permission to update or delete this resource",
    );
  });

  test("update space", async () => {
    const updateSpace: ApplicationMessage = {
      meta: {
        operationId: "update_space_001",
        author: NON_OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "space_updated",
        data: {
          id: "space_001",
          fields: createSpaceFields(),
        },
      },
    };

    await expect(auth.process(updateSpace)).rejects.toThrowError(
      "author does not have permission to update or delete this space",
    );
  });
});

describe("admin can update things too", () => {
  beforeAll(async () => {
    const assignAdminRole: ApplicationMessage = {
      meta: {
        operationId: "assign_user_role_001",
        author: OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "user_role_assigned",
        data: { publicKey: NON_OWNER_PUBLIC_KEY, role: "admin" },
      },
    };
    await users.create(CALENDAR_ID, NON_OWNER_PUBLIC_KEY, "panda");
    await processMessage(assignAdminRole);
  });

  test("update calendar", async () => {
    // User should already exist in the database.
    const user = await users.get(CALENDAR_ID, NON_OWNER_PUBLIC_KEY);
    expect(user?.role).toBe("admin");

    const updateCalendar: ApplicationMessage = {
      meta: {
        operationId: "update_calendar_001",
        author: NON_OWNER_PUBLIC_KEY,
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

    await expect(auth.process(updateCalendar)).resolves.toEqual(undefined);
  });

  test("update event", async () => {
    // User should already exist in the database.
    const user = await users.get(CALENDAR_ID, NON_OWNER_PUBLIC_KEY);
    expect(user?.role).toBe("admin");

    const updateEvent: ApplicationMessage = {
      meta: {
        operationId: "update_event_001",
        author: NON_OWNER_PUBLIC_KEY,
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

    await expect(auth.process(updateEvent)).resolves.toEqual(undefined);
  });

  test("update resource", async () => {
    // User should already exist in the database.
    const user = await users.get(CALENDAR_ID, NON_OWNER_PUBLIC_KEY);
    expect(user?.role).toBe("admin");

    const updateResource: ApplicationMessage = {
      meta: {
        operationId: "update_resource_001",
        author: NON_OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "resource_updated",
        data: {
          id: "resource_001",
          fields: createResourceFields(),
        },
      },
    };

    await expect(auth.process(updateResource)).resolves.toEqual(undefined);
  });

  test("update space", async () => {
    // User should already exist in the database.
    const user = await users.get(CALENDAR_ID, NON_OWNER_PUBLIC_KEY);
    expect(user?.role).toBe("admin");

    const updateSpace: ApplicationMessage = {
      meta: {
        operationId: "update_space_001",
        author: NON_OWNER_PUBLIC_KEY,
        stream: STREAM,
        logPath: LOG_PATH,
      },
      event: "application",
      data: {
        type: "space_updated",
        data: {
          id: "space_001",
          fields: createSpaceFields(),
        },
      },
    };

    await expect(auth.process(updateSpace)).resolves.toEqual(undefined);
  });
});
