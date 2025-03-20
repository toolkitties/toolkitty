import "fake-indexeddb/auto";

import { pendingQueue, processMessage } from "$lib/processor";
import {
  CALENDAR_ID,
  createAccessResponseMessage,
  createAssignRoleMessage,
  createBookingRequestMessage,
  createBookingResponseMessage,
  createCalendarMessage,
  createEventMessage,
  createRequestAccessMessage,
  createResourceMessage,
  createSpaceMessage,
  NON_OWNER_PUBLIC_KEY,
  OWNER_PUBLIC_KEY,
} from "$lib/utils/faker";
import { mockIPC } from "@tauri-apps/api/mocks";
import { beforeAll, expect, test } from "vitest";
import {
  access,
  auth,
  bookings,
  calendars,
  events,
  resources,
  spaces,
} from "$lib/api";

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
const bookingResponse001 = createBookingResponseMessage(
  "booking_response=001",
  OWNER_PUBLIC_KEY,
  "booking_request_002",
  "accept",
);
const createResourceOO3 = createResourceMessage(
  "resource_003",
  OWNER_PUBLIC_KEY,
  {
    type: "resource_created",
  },
);
const createSpaceOO3 = createSpaceMessage("space_003", OWNER_PUBLIC_KEY, {
  type: "space_created",
});
const accessRequest001 = createRequestAccessMessage(
  "access_request_001",
  NON_OWNER_PUBLIC_KEY,
);
const accessResponse001 = createAccessResponseMessage(
  "access_response_001",
  OWNER_PUBLIC_KEY,
  "access_request_001",
  "accept",
);
const assignRole001 = createAssignRoleMessage(
  "assign_role_001",
  OWNER_PUBLIC_KEY,
  NON_OWNER_PUBLIC_KEY,
  "admin",
);
const updateSpace002 = createSpaceMessage(
  "space_update_002",
  NON_OWNER_PUBLIC_KEY,
  {
    type: "space_updated",
    spaceId: "space_003",
  },
);
const updateResource002 = createResourceMessage(
  "resource_update_002",
  NON_OWNER_PUBLIC_KEY,
  {
    type: "resource_updated",
    resourceId: "resource_003",
  },
);

const messages: ApplicationMessage[] = [
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
  createResourceOO3,
  createSpaceOO3,
  accessRequest001,
  accessResponse001,
  assignRole001,
  updateResource002,
  updateSpace002,
];

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

beforeAll(async () => {
  mockIPC(async (cmd) => {
    if (cmd === "public_key") {
      return OWNER_PUBLIC_KEY;
    }
  });

  setInterval(async () => {
    for (const [, message] of pendingQueue) {
      await processMessage(message);
    }
  }, 100);

  for (const message of messages) {
    await processMessage(message);
  }
});

test("process out-of-order message", async () => {
  await delay(4000);
  // expect(messages.length).toBe(0);

  const calendarsCollection = await calendars.findMany();
  expect(calendarsCollection.length).toBe(1);
  expect(calendarsCollection[0].name).toBe(
    updateCalendar.data.data.fields.name!,
  );

  const eventsCollection = await events.findMany(CALENDAR_ID);
  expect(eventsCollection.length).toBe(1);
  expect(eventsCollection[0].name).toBe(updateEvent001.data.data.fields.name!);

  const resourcesCollection = await resources.findMany(CALENDAR_ID);
  expect(resourcesCollection.length).toBe(2);

  const spacesCollection = await spaces.findMany(CALENDAR_ID);
  expect(spacesCollection.length).toBe(2);

  const acceptedBookings = await bookings.findAll({ status: "accepted" });
  expect(acceptedBookings.length).toBe(1);
  const pendingBookings = await bookings.findAll({ status: "pending" });
  expect(pendingBookings.length).toBe(1);

  console.log("CHECK STATUS");
  const accessStatus = await access.checkStatus(
    NON_OWNER_PUBLIC_KEY,
    CALENDAR_ID,
  );
  expect(accessStatus).toBe("accepted");

  let isAdmin = await auth.isAdmin(CALENDAR_ID, OWNER_PUBLIC_KEY);
  expect(isAdmin).toBeTruthy();
  isAdmin = await auth.isAdmin(CALENDAR_ID, NON_OWNER_PUBLIC_KEY);
  expect(isAdmin).toBeTruthy();
}, 5000);
