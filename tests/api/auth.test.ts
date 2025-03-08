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

beforeAll(async () => {
  mockIPC((cmd, args) => {
    if (cmd === "public_key") {
      return OWNER_PUBLIC_KEY;
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

    await expect(auth.process(updateCalendar)).resolves.toEqual(undefined);
  });

  test("update event", async () => {
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

    await expect(auth.process(updateEvent)).resolves.toEqual(undefined);
  });

  test("update resource", async () => {
    let updateResource: ApplicationMessage = {
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
          fields: {
            name: "Updated Projector",
            description: "Updated HD projector for presentations.",
            contact: "newtechsupport@example.com",
            link: {
              type: "custom",
              title: "Updated Projector Info",
              url: "https://example.com/updated-projector-info",
            },
            images: [],
            availability: "always",
            multiBookable: true,
          },
        },
      },
    };

    await expect(auth.process(updateResource)).resolves.toEqual(undefined);
  });

  test("update space", async () => {
    let updateSpace: ApplicationMessage = {
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
          fields: {
            type: "physical",
            name: "Updated Conference Room A",
            location: {
              street: "456 Another St",
              city: "London",
              state: "London",
              zip: "E12",
              country: "UK",
            },
            messageForRequesters: "Please leave the space tidy after use",
            capacity: 25,
            accessibility: "Wheelchair accessible",
            description:
              "Updated spacious conference room with video conferencing facilities.",
            contact: "newadmin@example.com",
            link: {
              type: "custom",
              title: "Updated Room Info",
              url: "https://example.com/updated-room-info",
            },
            images: [],
            availability: [
              {
                start: new Date("2025-03-01T09:00:00Z"),
                end: new Date("2025-03-01T17:00:00Z"),
              },
            ],
            multiBookable: false,
          },
        },
      },
    };

    await expect(auth.process(updateSpace)).resolves.toEqual(undefined);
  });
});

describe("non-owners cannot perform updates", () => {
  test("update calendar", async () => {
    let updateCalendar: ApplicationMessage = {
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
        author: NON_OWNER_PUBLIC_KEY,
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

  test("update resource", async () => {
    let updateResource: ApplicationMessage = {
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
          fields: {
            name: "Updated Projector",
            description: "Updated HD projector for presentations.",
            contact: "newtechsupport@example.com",
            link: {
              type: "custom",
              title: "Updated Projector Info",
              url: "https://example.com/updated-projector-info",
            },
            images: [],
            availability: "always",
            multiBookable: true,
          },
        },
      },
    };

    await expect(auth.process(updateResource)).rejects.toThrowError(
      "author does not have permission to update or delete this resource",
    );
  });

  test("update space", async () => {
    let updateSpace: ApplicationMessage = {
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
          fields: {
            type: "physical",
            name: "Updated Conference Room A",
            location: {
              street: "456 Another St",
              city: "London",
              state: "London",
              zip: "E12",
              country: "UK",
            },
            messageForRequesters: "Please leave the space tidy after use",
            capacity: 25,
            accessibility: "Wheelchair accessible",
            description:
              "Updated spacious conference room with video conferencing facilities.",
            contact: "newadmin@example.com",
            link: {
              type: "custom",
              title: "Updated Room Info",
              url: "https://example.com/updated-room-info",
            },
            images: [],
            availability: [
              {
                start: new Date("2025-03-01T09:00:00Z"),
                end: new Date("2025-03-01T17:00:00Z"),
              },
            ],
            multiBookable: false,
          },
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
    let assignAdminRole: ApplicationMessage = {
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

    let updateCalendar: ApplicationMessage = {
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
    const user = await users.get(CALENDAR_ID, NON_OWNER_PUBLIC_KEY);
    expect(user?.role).toBe("admin");

    let updateEvent: ApplicationMessage = {
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

  test("update resource", async () => {
    // User should already exist in the database.
    const user = await users.get(CALENDAR_ID, NON_OWNER_PUBLIC_KEY);
    expect(user?.role).toBe("admin");

    let updateResource: ApplicationMessage = {
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
          fields: {
            name: "Updated Projector",
            description: "Updated HD projector for presentations.",
            contact: "newtechsupport@example.com",
            link: {
              type: "custom",
              title: "Updated Projector Info",
              url: "https://example.com/updated-projector-info",
            },
            images: [],
            availability: "always",
            multiBookable: true,
          },
        },
      },
    };

    await expect(auth.process(updateResource)).resolves.toEqual(undefined);
  });

  test("update space", async () => {
    // User should already exist in the database.
    const user = await users.get(CALENDAR_ID, NON_OWNER_PUBLIC_KEY);
    expect(user?.role).toBe("admin");

    let updateSpace: ApplicationMessage = {
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
          fields: {
            type: "physical",
            name: "Updated Conference Room A",
            location: {
              street: "456 Another St",
              city: "London",
              state: "London",
              zip: "E12",
              country: "UK",
            },
            messageForRequesters: "Please leave the space tidy after use",
            capacity: 25,
            accessibility: "Wheelchair accessible",
            description:
              "Updated spacious conference room with video conferencing facilities.",
            contact: "newadmin@example.com",
            link: {
              type: "custom",
              title: "Updated Room Info",
              url: "https://example.com/updated-room-info",
            },
            images: [],
            availability: [
              {
                start: new Date("2025-03-01T09:00:00Z"),
                end: new Date("2025-03-01T17:00:00Z"),
              },
            ],
            multiBookable: false,
          },
        },
      },
    };

    await expect(auth.process(updateSpace)).resolves.toEqual(undefined);
  });
});
