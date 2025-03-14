import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import {
  CALENDAR_ID,
  createBookingRequestMessage,
  createCalendarMessage,
  createEventMessage,
  createResourceMessage,
  createSpaceMessage,
  LOG_PATH,
  NON_OWNER_PUBLIC_KEY,
  OWNER_PUBLIC_KEY,
  STREAM,
} from "$lib/utils/faker";
import { mockIPC } from "@tauri-apps/api/mocks";
import { beforeAll, expect, test } from "vitest";
import { bookings, calendars, events, resources, spaces } from "$lib/api";
import { debounce } from "$lib/utils/utils";

const createCalendar = createCalendarMessage(CALENDAR_ID, OWNER_PUBLIC_KEY, {
  type: "calendar_created",
});

const updateCalendar = createCalendarMessage(
  "calendar_update_001",
  OWNER_PUBLIC_KEY,
  {
    type: "calendar_updated",
    calendarId: CALENDAR_ID,
  },
);
const createEventOO1 = createEventMessage("event_001", OWNER_PUBLIC_KEY, {
  type: "event_created",
});
const updateEvent001 = createEventMessage(
  "event_update_001",
  OWNER_PUBLIC_KEY,
  {
    type: "event_updated",
    eventId: "event_001",
  },
);
const createEventOO2 = createEventMessage("event_002", OWNER_PUBLIC_KEY, {
  type: "event_created",
});
const deleteEvent002 = createEventMessage(
  "event_delete_002",
  OWNER_PUBLIC_KEY,
  {
    type: "event_deleted",
    eventId: "event_002",
  },
);
const createResourceOO1 = createResourceMessage(
  "resource_001",
  OWNER_PUBLIC_KEY,
  {
    type: "resource_created",
  },
);
const updateResource001 = createResourceMessage(
  "resource_update_001",
  OWNER_PUBLIC_KEY,
  {
    type: "resource_updated",
    resourceId: "resource_001",
  },
);
const createResourceOO2 = createResourceMessage(
  "resource_002",
  OWNER_PUBLIC_KEY,
  {
    type: "resource_created",
  },
);
const deleteResource002 = createResourceMessage(
  "resource_delete_002",
  OWNER_PUBLIC_KEY,
  {
    type: "resource_deleted",
    resourceId: "resource_002",
  },
);
const createSpaceOO1 = createSpaceMessage("space_001", OWNER_PUBLIC_KEY, {
  type: "space_created",
});
const updateSpace001 = createSpaceMessage(
  "space_update_001",
  OWNER_PUBLIC_KEY,
  {
    type: "space_updated",
    spaceId: "space_001",
  },
);
const createSpaceOO2 = createSpaceMessage("space_002", OWNER_PUBLIC_KEY, {
  type: "space_created",
});
const deleteSpace002 = createSpaceMessage(
  "space_delete_002",
  OWNER_PUBLIC_KEY,
  {
    type: "space_deleted",
    spaceId: "space_002",
  },
);

const bookingRequest001 = createBookingRequestMessage(
  "booking_request_001",
  OWNER_PUBLIC_KEY,
  "resource",
  "resource_001",
  "event_001",
);

const bookingRequest002 = createBookingRequestMessage(
  "booking_request_002",
  NON_OWNER_PUBLIC_KEY,
  "space",
  "space_001",
  "event_001",
);

const bookingResponse001: ApplicationMessage = {
  meta: {
    operationId: "booking_request_response_001",
    author: OWNER_PUBLIC_KEY,
    stream: STREAM,
    logPath: LOG_PATH,
  },
  event: "application",
  data: {
    type: "booking_request_accepted",
    data: {
      requestId: "booking_request_001",
    },
  },
};

let messages: ApplicationMessage[] = [
  createCalendar,
  updateCalendar,
  createEventOO1,
  updateEvent001,
  createEventOO2,
  deleteEvent002,
  createResourceOO1,
  updateResource001,
  createResourceOO2,
  deleteResource002,
  createSpaceOO1,
  updateSpace001,
  createSpaceOO2,
  deleteSpace002,
  bookingRequest001,
  bookingRequest002,
  bookingResponse001,
];

function randomize(message: ApplicationMessage[]) {
  let index = message.length,
    randomIndex;

  while (index != 0) {
    randomIndex = Math.floor(Math.random() * index);
    index--;

    [message[index], message[randomIndex]] = [
      message[randomIndex],
      message[index],
    ];
  }

  return message;
}

const replay = async () => {
  for (const message of randomize(messages)) {
    await processMessage(message);
  }
};

const debouncedReplay = debounce(replay, 200);

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

beforeAll(async () => {
  mockIPC(async (cmd, args) => {
    if (cmd === "public_key") {
      return OWNER_PUBLIC_KEY;
    }

    if (cmd === "ack") {
      const { operationId } = args as { operationId: OperationId };
      messages = messages.filter(
        (message) => message.meta.operationId !== operationId,
      );
    }

    if (cmd === "replay") {
      debouncedReplay("fake_topic");
    }
  });

  await replay();
});

test("process out-of-order message", async () => {
  await delay(3000);
  expect(messages.length).toBe(0);

  const calendarsCollection = await calendars.findMany();
  expect(calendarsCollection.length).toBe(1);
  expect(calendarsCollection[0].name).toBe(
    updateCalendar.data.data.fields.name!,
  );

  const eventsCollection = await events.findMany(CALENDAR_ID);
  expect(eventsCollection.length).toBe(1);
  expect(eventsCollection[0].name).toBe(updateEvent001.data.data.fields.name!);

  const resourcesCollection = await resources.findMany(CALENDAR_ID);
  expect(resourcesCollection.length).toBe(1);
  expect(resourcesCollection[0].name).toBe(
    updateResource001.data.data.fields.name!,
  );

  const spacesCollection = await spaces.findMany(CALENDAR_ID);
  expect(spacesCollection.length).toBe(1);
  expect(spacesCollection[0].name).toBe(updateSpace001.data.data.fields.name!);

  const acceptedBookings = await bookings.findAll({ status: "accepted" });
  expect(acceptedBookings.length).toBe(1);
  const pendingBookings = await bookings.findAll({ status: "pending" });
  expect(pendingBookings.length).toBe(1);
}, 5000);
