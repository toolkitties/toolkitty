import { createCalendarMessage, createEventMessage, createResourceMessage, createSpaceMessage } from "./faker";

export const STREAM_ROOT_HASH =
  "8e7a6675a5fd2f89d7893200d39698b466fe98e3fbee30b7911c97c30bf65315";
export const CALENDAR_ID =
  "40aa69dd28f17d1adb55d560b6295c399e2fc03daa49ae015b4f5ccb151b8ac5";
export const OWNER_PUBLIC_KEY =
  "94dae7402bdf9049e96e1a02bbae97baa714c498324538f81c7b4ba0a94bf4d7";
export const NON_OWNER_PUBLIC_KEY =
  "24dae7402bdf9049e96e1a02bbae97baa714c498324538f81c7b4ba0a94bf4d7";
export const LOG_PATH = "calendar";

export const STREAM = {
  id: CALENDAR_ID,
  rootHash: STREAM_ROOT_HASH,
  owner: OWNER_PUBLIC_KEY,
};

export const seedTestMessages = (): ApplicationMessage[] => {
  const calendarStart = new Date("2025-03-01T09:00:00Z");
  const calendarEnd = new Date("2025-03-01T17:00:00Z");

  const calendar001 = createCalendarMessage(
    "calendar_001",
    OWNER_PUBLIC_KEY,
    {
      type: "calendar_created",
    },
    { dates: [{ start: calendarStart, end: calendarEnd }] },
  );

  const event001 = createEventMessage(
    "event_001",
    OWNER_PUBLIC_KEY,
    {
      type: "event_created",
    },
    {
      startDate: "2025-03-05T10:00:00Z",
      endDate: "2025-03-05T11:00:00Z",
    },
  );

  const resource001 = createResourceMessage(
    "resource_001",
    OWNER_PUBLIC_KEY,
    {
      type: "resource_created",
    },
    { availability: "always" },
  );
  const space001 = createSpaceMessage(
    "space_001",
    OWNER_PUBLIC_KEY,
    {
      type: "space_created",
    },
    {
      availability: [
        {
          start: new Date("2025-03-01T09:00:00Z"),
          end: new Date("2025-03-01T17:00:00Z"),
        },
      ],
    },
  );

  return [
    calendar001,
    event001,
    resource001,
    space001,
    {
      meta: {
        operationId: "booking_request_001",
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
          message: "Hi, can I haz your projector?",
          timeSpan: {
            start: new Date("2025-03-01T09:00:00Z"),
            end: new Date("2025-03-01T17:00:00Z"),
          },
        },
      },
    },
    {
      meta: {
        operationId: "booking_request_002",
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
          timeSpan: {
            start: new Date("2025-03-01T09:00:00Z"),
            end: new Date("2025-03-01T17:00:00Z"),
          },
        },
      },
    },
  ];
};
