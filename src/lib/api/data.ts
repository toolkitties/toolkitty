import { bookings, calendars, events, resources, spaces } from ".";
import { setActiveCalendar } from "./calendars";

export async function seedData() {
  const [operationId, calendarId] = await calendars.create({
    fields: {
      name: "Antiuniversity",
      dates: [
        {
          start: new Date("2025-01-20T00:00:00Z"),
          end: new Date("2025-01-27T00:00:00Z"),
        },
      ],
      festivalInstructions: null,
      spacePageText: null,
      resourcePageText: null
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
      festivalInstructions: null,
      spacePageText: null,
      resourcePageText: null
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
      festivalInstructions: null,
      spacePageText: null,
      resourcePageText: null
    },
  });

  await setActiveCalendar(calendarId);

  const spaceOneId = await spaces.create(calendarId, {
    type: "physical",
    name: "1",
    location: "123 Street Street",
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
        start: new Date("2025-01-01T00:00:00Z"),
        end: new Date("2025-02-30T00:00:00Z"),
      },
    ],
    multiBookable: false,
  });

  const spaceTwoId = await spaces.create(calendarId, {
    type: "physical",
    name: "Recording Studio",
    location: "34 Road Avenue",
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
        start: new Date("2025-01-01T00:00:00Z"),
        end: new Date("2025-02-30T00:00:00Z"),
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
        start: new Date("2025-01-20T00:00:00Z"),
        end: new Date("2025-01-22T00:00:00Z"),
      },
      {
        start: new Date("2025-01-24T00:00:00Z"),
        end: new Date("2025-01-26T00:00:00Z"),
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
        start: new Date("2025-01-01T00:00:00Z"),
        end: new Date("2025-02-30T00:00:00Z"),
      },
    ],
    multiBookable: false,
  });

  const eventOneId = await events.create(calendarId, {
    name: "Kitty Fest 25",
    description: "A grand music festival with various artists.",
    startDate: new Date("2025-01-06T14:00:00Z"),
    endDate: new Date("2025-01-06T20:00:00Z"),
    location: `${spaceOneId}`,
    images: [],
    resources: [`${resourceOneId}`],
    links: [],
  });

  const eventTwoId = await events.create(calendarId, {
    name: "Art Exhibition",
    description: "An exhibition showcasing modern art.",
    startDate: new Date("2025-02-10T10:00:00.000Z"),
    endDate: new Date("2025-02-10T17:00:00.000Z"),
    location: "",
    images: [],
    resources: [],
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

  const resourceResponseId = await bookings.accept(resourceRequestId);

  const resourceTwoResponseId = await bookings.request(
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
