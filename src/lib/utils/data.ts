import { bookings, calendars, events, resources, spaces } from "$lib/api";
import {
  createCalendarFields,
  createEventFields,
  createResourceFields,
  createSpaceFields,
  someAvailability,
} from "./faker";
import { setActiveCalendar } from "$lib/api/calendars";
import { faker } from "@faker-js/faker";
import { TimeSpanClass } from "$lib/timeSpan";

export async function seedData() {
  // Create one calendar.
  const startDate = faker.date.soon();
  const endDate = faker.date.future({ refDate: startDate });
  const calendarFields = createCalendarFields({
    dates: [{ start: startDate.toISOString(), end: endDate.toISOString() }],
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
  const spaceAvailability = someAvailability(startDate, endDate);
  const spaceId = await spaces.create(
    calendarId,
    createSpaceFields({
      availability: spaceAvailability,
    }),
  );
  await spaces.create(
    calendarId,
    createSpaceFields({ availability: someAvailability(startDate, endDate) }),
  );
  await spaces.create(
    calendarId,
    createSpaceFields({ availability: someAvailability(startDate, endDate) }),
  );

  // Create some spaces (associated with our first calendar)
  const resourceAvailability = someAvailability(startDate, endDate);
  const resourceId = await resources.create(
    calendarId,
    createResourceFields({
      availability: resourceAvailability,
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability: someAvailability(startDate, endDate),
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability: someAvailability(startDate, endDate),
    }),
  );
  await resources.create(
    calendarId,
    createResourceFields({
      availability: someAvailability(startDate, endDate),
    }),
  );

  // Create some events (associated with our first calendar)
  const eventStartDate = spaceAvailability[0].start;
  const eventEndDate = spaceAvailability[0].end;
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

  const resourceRequests = [];
  for (const availability of resourceAvailability) {
    const eventTimeSpan = new TimeSpanClass({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
    const availabilityTimeSpan = new TimeSpanClass(availability);
    if (eventTimeSpan.contains(availabilityTimeSpan)) {
      const resourceRequestId = await bookings.request(
        eventId,
        resourceId,
        "resource",
        "please can i haz?",
        availability,
      );
      resourceRequests.push(resourceRequestId);
      break;
    }
  }

  // Update first event with resource and space requests.
  await events.update(
    eventId,
    createEventFields({
      ...eventFields,
      resourcesRequests: resourceRequests,
      spaceRequest: spaceRequestId,
    }),
  );

  //
  //   eventStartDate = faker.date.between({ from: startDate, to: endDate });
  //   eventEndDate = faker.date.soon({ refDate: eventStartDate });
  //   await events.create(
  //     calendarId,
  //     createEventFields({
  //       startDate: eventStartDate.toISOString(),
  //       endDate: eventEndDate.toISOString(),
  //     }),
  //   );
  //
  //   eventStartDate = faker.date.between({ from: startDate, to: endDate });
  //   eventEndDate = faker.date.soon({ refDate: eventStartDate });
  //   await events.create(
  //     calendarId,
  //     createEventFields({
  //       startDate: eventStartDate.toISOString(),
  //       endDate: eventEndDate.toISOString(),
  //     }),
  //   );
  //
  //   eventStartDate = faker.date.between({ from: startDate, to: endDate });
  //   eventEndDate = faker.date.soon({ refDate: eventStartDate });
  //   await events.create(
  //     calendarId,
  //     createEventFields({
  //       startDate: eventStartDate.toISOString(),
  //       endDate: eventEndDate.toISOString(),
  //     }),
  //   );
}
