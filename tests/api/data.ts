import {
  createCalendarMessage,
  createEventMessage,
  createResourceMessage,
  createSpaceMessage,
  LOG_PATH,
  OWNER_PUBLIC_KEY,
  STREAM,
} from "$lib/utils/faker";

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
