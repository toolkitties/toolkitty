import {
  createBookingRequestMessage,
  createCalendarMessage,
  createEventMessage,
  createResourceMessage,
  createSpaceMessage,
  OWNER_PUBLIC_KEY,
} from "$lib/utils/faker";

export const calendar001Start = "2025-03-01T09:00:00Z";
export const calendar001End = "2025-07-01T17:00:00Z";
export const event001Start = "2025-03-01T10:00:00Z";
export const event001End = "2025-03-01T17:00:00Z";
export const bookingRequest001Start = "2025-03-01T10:00:00Z";
export const bookingRequest001End = "2025-03-01T11:00:00Z";
export const bookingRequest002Start = "2025-03-01T12:00:00Z";
export const bookingRequest002End = "2025-03-01T13:00:00Z";

export const seedTestMessages = (): ApplicationMessage[] => {
  const calendar001 = createCalendarMessage(
    "calendar_001",
    OWNER_PUBLIC_KEY,
    {
      type: "calendar_created",
    },
    { dates: [{ start: calendar001Start, end: calendar001End }] },
  );

  const event001 = createEventMessage(
    "event_001",
    OWNER_PUBLIC_KEY,
    {
      type: "event_created",
    },
    {
      startDate: event001Start,
      endDate: event001End,
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
          start: event001Start,
          end: event001End,
        },
      ],
    },
  );

  const bookingRequest001 = createBookingRequestMessage(
    "booking_request_001",
    OWNER_PUBLIC_KEY,
    "resource",
    "resource_001",
    "event_001",
    {
      start: bookingRequest001Start,
      end: bookingRequest001End,
    },
  );

  const bookingRequest002 = createBookingRequestMessage(
    "booking_request_002",
    OWNER_PUBLIC_KEY,
    "space",
    "space_001",
    "event_001",
    {
      start: bookingRequest002Start,
      end: bookingRequest002End,
    },
  );

  return [
    calendar001,
    event001,
    resource001,
    space001,
    bookingRequest001,
    bookingRequest002,
  ];
};
