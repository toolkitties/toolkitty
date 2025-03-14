import { bookings, calendars, events, resources, spaces } from "$lib/api";
import {
  createCalendarFields,
  createEventFields,
  createResourceFields,
  createSpaceFields,
} from "./faker";
import { setActiveCalendar } from "$lib/api/calendars";
import { faker } from "@faker-js/faker";

export async function seedData() {
  // Create one calendar.
  const calendarFields = createCalendarFields();
  const startDate = calendarFields.dates[0].start;
  const endDate = calendarFields.dates[0].end!;
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
  const spaceId = await spaces.create(
    calendarId,
    createSpaceFields({ availability: [{ start: startDate, end: endDate }] }),
  );
  await spaces.create(
    calendarId,
    createSpaceFields({ availability: [{ start: startDate, end: endDate }] }),
  );
  await spaces.create(
    calendarId,
    createSpaceFields({ availability: [{ start: startDate, end: endDate }] }),
  );

  // Create some spaces (associated with our first calendar)
  const resourceId = await resources.create(
    calendarId,
    createResourceFields({
      availability: [{ start: startDate, end: endDate }],
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability: [{ start: startDate, end: endDate }],
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability: [{ start: startDate, end: endDate }],
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability: [{ start: startDate, end: endDate }],
    }),
  );

  // Create some events (associated with our first calendar)
  let eventStartDate = faker.date.soon({ days: 6, refDate: startDate });
  let eventEndDate = faker.date.soon({ refDate: eventStartDate });
  const eventFields = createEventFields({
    startDate: eventStartDate.toISOString(),
    endDate: eventEndDate.toISOString(),
  });
  const eventId = await events.create(calendarId, eventFields);
  // Make resource request for first event.
  const resourceRequestId = await bookings.request(
    eventId,
    resourceId,
    "resource",
    "please can i haz?",
    { start: eventStartDate.toISOString(), end: eventEndDate.toISOString() },
  );
  // Make space request for first event.
  const spaceRequestId = await bookings.request(
    eventId,
    spaceId,
    "space",
    "please can i haz?",
    { start: eventStartDate.toISOString(), end: eventEndDate.toISOString() },
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

  eventStartDate = faker.date.soon({ days: 6, refDate: startDate });
  eventEndDate = faker.date.soon({ refDate: eventStartDate });
  await events.create(
    calendarId,
    createEventFields({
      startDate: eventStartDate.toISOString(),
      endDate: eventEndDate.toISOString(),
    }),
  );
  
  eventStartDate = faker.date.soon({ days: 6, refDate: startDate });
  eventEndDate = faker.date.soon({ refDate: eventStartDate });
  await events.create(
    calendarId,
    createEventFields({
      startDate: eventStartDate.toISOString(),
      endDate: eventEndDate.toISOString(),
    }),
  );

  eventStartDate = faker.date.soon({ days: 6, refDate: startDate });
  eventEndDate = faker.date.soon({ refDate: eventStartDate });
  await events.create(
    calendarId,
    createEventFields({
      startDate: eventStartDate.toISOString(),
      endDate: eventEndDate.toISOString(),
    }),
  );
}
