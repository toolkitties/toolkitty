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
  const eventFields = createEventFields({
    startDate: startDate,
    endDate: endDate,
  });
  const eventId = await events.create(calendarId, eventFields);
  await events.create(
    calendarId,
    createEventFields({
      startDate: startDate,
      endDate: endDate,
    }),
  );
  await events.create(
    calendarId,
    createEventFields({
      startDate: startDate,
      endDate: endDate,
    }),
  );
  await events.create(
    calendarId,
    createEventFields({
      startDate: startDate,
      endDate: endDate,
    }),
  );

  // Make resource request for first event.
  const resourceRequestId = await bookings.request(
    eventId,
    resourceId,
    "resource",
    "please can i haz?",
    { start: startDate, end: endDate },
  );

  // Make space request for first event.
  const spaceRequestId = await bookings.request(
    eventId,
    spaceId,
    "space",
    "please can i haz?",
    { start: startDate, end: endDate },
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
