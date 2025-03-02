export const OPERATION_ID =
  "8e7a6675a5fd2f89d7893200d39698b466fe98e3fbee30b7911c97c30bf65315";
export const CALENDAR_ID =
  "40aa69dd28f17d1adb55d560b6295c399e2fc03daa49ae015b4f5ccb151b8ac5";
export const PUBLIC_KEY =
  "94dae7402bdf9049e96e1a02bbae97baa714c498324538f81c7b4ba0a94bf4d7";

export const calendarTestMessages: ChannelMessage[] = [
  {
    meta: {
      operationId: OPERATION_ID,
      author: PUBLIC_KEY,
      stream: {
        id: CALENDAR_ID,
        rootHash: OPERATION_ID,
        owner: PUBLIC_KEY,
      },
      logPath: "calendar",
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
