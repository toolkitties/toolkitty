import { bookings, calendars, events, resources, spaces } from "$lib/api";
import {
  createCalendarFields,
  createEventFields,
  createResourceFields,
  createSpaceFields,
} from "./faker";
import { setActiveCalendar } from "$lib/api/calendars";

export async function seedData() {
  // Create one calendar.
  const startDate = "2025-03-20T14:00:00.000Z";
  const endDate = "2025-03-29T14:00:00.000Z";
  const calendarFields = createCalendarFields({
    dates: [{ start: startDate, end: endDate }],
  });
  const [, calendarId] = await calendars.create({
    fields: calendarFields,
  });

  // Set it as our active calendar.
  await setActiveCalendar(calendarId);

  // Create more calendars.
  await calendars.create({
    fields: createCalendarFields(),
  });
  await calendars.create({ fields: createCalendarFields() });

  // Create some spaces (associated with our first calendar)
  const availability = [
    { start: startDate, end: "2025-03-20T19:00:00.000Z" },
    { start: "2025-03-21T12:00:00.000Z", end: "2025-03-21T19:00:00.000Z" },
  ];
  const spaceId = await spaces.create(
    calendarId,
    createSpaceFields({
      availability,
    }),
  );
  await spaces.create(calendarId, createSpaceFields({ availability }));
  await spaces.create(calendarId, createSpaceFields({ availability }));

  // Create some spaces (associated with our first calendar)
  const resourceId = await resources.create(
    calendarId,
    createResourceFields({
      availability,
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability,
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability,
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability,
    }),
  );

  // Create some events (associated with our first calendar)
  const eventStartDate = availability[0].start;
  const eventEndDate = "2025-03-20T16:00:00.000Z";
  const eventFields = createEventFields({
    startDate: eventStartDate,
    endDate: eventEndDate,
  });
  const eventId = await events.create(calendarId, eventFields);

  // Make space request for first event.
  const spaceRequestId = await bookings.request(
    eventId,
    spaceId,
    "space",
    "please can i haz?",
    { start: eventStartDate, end: eventEndDate },
  );

  const resourceRequestId = await bookings.request(
    eventId,
    resourceId,
    "resource",
    "please can i haz?",
    { start: eventStartDate, end: eventEndDate },
  );

  // Update first event with resource and space requests.
  await events.update(
    eventId,
    createEventFields({
      ...eventFields,
      resourcesRequests: [resourceRequestId],
      spaceRequest: spaceRequestId,
    }),
  );
}
