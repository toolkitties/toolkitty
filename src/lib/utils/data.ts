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
  const startDate = "2025-03-20T14:00Z";
  const endDate = "2025-03-29T14:00Z";
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
    { start: startDate, end: "2025-03-20T19:00Z" },
    { start: "2025-03-21T12:00Z", end: "2025-03-21T19:00Z" },
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
  const eventEndDate = "2025-03-20T16:00Z";
  const eventFields = createEventFields({
    startDate: eventStartDate,
    endDate: eventEndDate,
  });

  const eventStartDate2 = availability[1].start;
  const eventEndDate2 = "2025-03-21T19:00Z";
  const eventFields2 = createEventFields({
    startDate: eventStartDate2,
    endDate: eventEndDate2,
  });

  const eventId = await events.create(calendarId, eventFields);
  await events.create(calendarId, eventFields2);

  // Make space request for first event.
  await bookings.request(
    eventId,
    spaceId,
    "space",
    "please can i haz?",
    { start: eventStartDate, end: eventEndDate },
  );

  await bookings.request(
    eventId,
    resourceId,
    "resource",
    "please can i haz?",
    { start: eventStartDate, end: eventEndDate },
  );
}
