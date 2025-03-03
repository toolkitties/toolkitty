export const STREAM_ROOT_HASH =
  "8e7a6675a5fd2f89d7893200d39698b466fe98e3fbee30b7911c97c30bf65315";
export const CALENDAR_ID =
  "40aa69dd28f17d1adb55d560b6295c399e2fc03daa49ae015b4f5ccb151b8ac5";
export const PUBLIC_KEY =
  "94dae7402bdf9049e96e1a02bbae97baa714c498324538f81c7b4ba0a94bf4d7";
const LOG_PATH = "calendar";

const stream = {
  id: CALENDAR_ID,
  rootHash: STREAM_ROOT_HASH,
  owner: PUBLIC_KEY,
};

export const calendarTestMessages: ChannelMessage[] = [
  {
    meta: {
      operationId: "OP01",
      author: PUBLIC_KEY,
      stream,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "calendar_created",
      data: {
        fields: {
          name: "My Festival",
          dates: [
            {
              start: new Date("2025-01-06T14:00:00Z"),
              end: new Date("2025-01-08T14:00:00Z"),
            },
          ],
        },
      },
    },
  },
];

export const bookingTestMessages: ChannelMessage[] = [
  {
    meta: {
      operationId: "calendar_001",
      author: PUBLIC_KEY,
      stream,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "calendar_created",
      data: {
        fields: {
          name: "Team Calendar",
          dates: [
            {
              start: new Date("2025-03-01T09:00:00Z"),
              end: new Date("2025-03-01T17:00:00Z"),
            },
          ],
        },
      },
    },
  },
  {
    meta: {
      operationId: "event_001",
      author: PUBLIC_KEY,
      stream,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "event_created",
      data: {
        fields: {
          name: "Team Meeting",
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
  },
  {
    meta: {
      operationId: "resource_001",
      author: PUBLIC_KEY,
      stream,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "resource_created",
      data: {
        fields: {
          name: "Projector",
          description: "HD projector for presentations.",
          contact: "techsupport@example.com",
          link: {
            type: "custom",
            title: "Projector Info",
            url: "https://example.com/projector-info",
          },
          images: [],
          availability: "always",
          multiBookable: true,
        },
      },
    },
  },
  {
    meta: {
      operationId: "space_001",
      author: PUBLIC_KEY,
      stream,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "space_created",
      data: {
        fields: {
          type: "physical",
          name: "Conference Room A",
          location: {
            street: "123 My St",
            city: "London",
            state: "London",
            zip: "E11",
            country: "UK",
          },
          capacity: 20,
          accessibility: "Wheelchair accessible",
          description: "Spacious conference room with video conferencing facilities.",
          contact: "admin@example.com",
          link: {
            type: "custom",
            title: "Room Info",
            url: "https://example.com/room-info",
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
  },
  {
    meta: {
      operationId: "resource_request_001",
      author: PUBLIC_KEY,
      stream,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "resource_requested",
      data: {
        type: "resource",
        resourceId: "resource_001",
        eventId: "event_001",
        message: "Hi, can I haz your projector?",
        timeSpan: {
          start: new Date("2025-03-01T09:00:00Z"),
          end: new Date("2025-03-01T17:00:00Z"),
        },
  }
    },
  },
  {
    meta: {
      operationId: "resource_request_response_001",
      author: PUBLIC_KEY,
      stream,
      logPath: LOG_PATH,
    },
    event: "application",
    data: {
      type: "resource_request_accepted",
      data: {
        requestId: "resource_request_001",
      },
    },
  },
];
