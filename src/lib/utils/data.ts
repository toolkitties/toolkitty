import { bookings, calendars, events, resources, spaces } from "$lib/api";
import {
  createCalendarFields,
  createEventFields,
  createResourceFields,
  createSpaceFields,
} from "./faker";
import { setActiveCalendar } from "$lib/api/calendars";

export async function seedData() {
  const calendarFields = createCalendarFields();
  const [, calendarId] = await calendars.create({
    fields: calendarFields,
  });
  await setActiveCalendar(calendarId);
  const startDate = calendarFields.dates[0].start;
  const endDate = calendarFields.dates[0].end!;

  await calendars.create({
    fields: createCalendarFields(),
  });
  await calendars.create({ fields: createCalendarFields() });
  await calendars.create({ fields: createCalendarFields() });
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
  const eventId = await events.create(
    calendarId,
    createEventFields({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
  );
  await events.create(
    calendarId,
    createEventFields({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
  );
  await events.create(
    calendarId,
    createEventFields({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
  );
  await events.create(
    calendarId,
    createEventFields({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
  );
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
  const resourceRequestId = await bookings.request(
    eventId,
    resourceId,
    "resource",
    "please can i haz?",
    { start: startDate, end: endDate },
  );
  await bookings.accept(resourceRequestId);
  const spaceRequestId = await bookings.request(
    eventId,
    spaceId,
    "space",
    "please can i haz?",
    { start: startDate, end: endDate },
  );
  await events.update(
    eventId,
    createEventFields({
      resourcesRequests: [resourceRequestId],
      spaceRequest: spaceRequestId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
  );
}
