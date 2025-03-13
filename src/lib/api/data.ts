import { bookings, calendars, events, resources, spaces } from ".";
import { setActiveCalendar } from "./calendars";

export async function seedData() {
  const [, calendarId] = await calendars.create({
    fields: {
      name: "Antiuniversity",
      dates: [
        {
          start: new Date("2025-01-20T00:00:00Z"),
          end: new Date("2025-01-27T00:00:00Z"),
        },
      ],
      calendarInstructions: null,
      spacePageText: null,
      resourcePageText: null,
    },
  });

  await calendars.create({
    fields: {
      name: "Pedals 3000",
      dates: [
        {
          start: new Date("2025-01-20T00:00:00Z"),
          end: new Date("2025-01-27T00:00:00Z"),
        },
      ],
      calendarInstructions: null,
      spacePageText: null,
      resourcePageText: null,
    },
  });

  await calendars.create({
    fields: {
      name: "Cute venue",
      dates: [
        {
          start: new Date("2025-01-20T00:00:00Z"),
          end: new Date("2025-01-27T00:00:00Z"),
        },
      ],
      calendarInstructions: null,
      spacePageText: null,
      resourcePageText: null,
    },
  });

  await setActiveCalendar(calendarId);

  const spaceOneId = await spaces.create(calendarId, {
    name: "1",
    location: {
      type: "physical",
      street: "123 My Street",
      city: "My City",
      state: "My State",
      zip: "123ABC",
      country: "UK",
    },
    capacity: 0,
    accessibility: "Wheelchair accessible",
    description: "A stage, a main one",
    contact: "Message on Signal",
    link: {
      type: "custom",
      title: "Venue website",
      url: "www.somewebsite.com",
    },
    images: [
      "https://placecats.com/neo_banana/300/200",
      "https://placecats.com/neo_2/300/200",
    ],
    messageForRequesters: "Call me after 6pm",
    availability: [
      {
        start: new Date("2025-01-01T09:00:00Z"),
        end: new Date("2025-01-30T23:00:00Z"),
      },
    ],
    multiBookable: false,
  });

  await spaces.create(calendarId, {
    name: "Recording Studio",
    location: {
      type: "physical",
      street: "123 My Street",
      city: "My City",
      state: "My State",
      zip: "123ABC",
      country: "UK",
    },
    capacity: 20,
    accessibility: "www.website.com/accessibility",
    description:
      "A small recording studio with lots of equipment, that sounds good.",
    contact: "Message via email",
    link: {
      type: "custom",
      title: "Venue website",
      url: "www.somewebsite.com",
    },
    images: [
      "https://placecats.com/neo_banana/300/200",
      "https://placecats.com/neo_2/300/200",
    ],
    messageForRequesters: "Call me after 6pm",
    availability: [
      {
        start: new Date("2025-01-01T09:00:00Z"),
        end: new Date("2025-01-30T23:00:00Z"),
      },
    ],
    multiBookable: false,
  });

  const resourceOneId = await resources.create(calendarId, {
    name: "Projector",
    description: "Epson CO-FH01 Full HD Projector",
    contact: "Signal @beamer",
    link: {
      type: "custom",
      title: null,
      url: "",
    },
    images: [],
    availability: [
      {
        start: new Date("2025-01-20T09:00:00Z"),
        end: new Date("2025-01-22T23:00:00Z"),
      },
      {
        start: new Date("2025-01-24T09:00:00Z"),
        end: new Date("2025-01-26T23:00:00Z"),
      },
    ],
    multiBookable: false,
  });

  const resourceTwoId = await resources.create(calendarId, {
    name: "XLR Cables",
    description: "as above. Call me to confirm pick up",
    contact: "",
    link: {
      type: "custom",
      title: null,
      url: "",
    },
    images: [],
    availability: [
      {
        start: new Date("2025-01-01T10:00:00Z"),
        end: new Date("2025-01-30T13:00:00Z"),
      },
    ],
    multiBookable: false,
  });

  const eventOneId = await events.create(calendarId, {
    name: "Kitty Fest 25",
    description: "A grand music festival with various artists.",
    startDate: "2025-01-06T14:00:00Z",
    endDate: "2025-01-06T20:00:00Z",
    spaceRequest: `${spaceOneId}`,
    images: [],
    resourcesRequests: [`${resourceOneId}`],
    links: [],
  });

  await events.create(calendarId, {
    name: "Art Exhibition",
    description: "An exhibition showcasing modern art.",
    startDate: "2025-02-10T10:00:00.000Z",
    endDate: "2025-02-10T17:00:00.000Z",
    spaceRequest: "",
    images: [],
    resourcesRequests: [],
    links: [],
  });

  const resourceRequestId = await bookings.request(
    eventOneId,
    resourceOneId,
    "resource",
    "please can i haz?",
    {
      start: new Date("2025-01-20T00:00:00Z"),
      end: new Date("2025-01-22T00:00:00Z"),
    },
  );

  await bookings.accept(resourceRequestId);

  await bookings.request(
    eventOneId,
    resourceTwoId,
    "resource",
    "please can i haz?",
    {
      start: new Date("2025-01-20T00:00:00Z"),
      end: new Date("2025-01-22T00:00:00Z"),
    },
  );
}
