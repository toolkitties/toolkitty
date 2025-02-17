export const resources: Resource[] = [
  {
    id: "1",
    name: "Projector",
    ownerId: "1",
    description: "Epson CO-FH01 Full HD Projector",
    contact: "Signal @beamer",
    availability: [
      {
        start: new Date("2025-02-20T10:00:00Z"),
        end: new Date("2025-02-20T15:20:00Z"),
      },
      {
        start: new Date("2025-02-21T10:00:00Z"),
        end: new Date("2025-02-21T12:00:00Z"),
      },
      {
        start: new Date("2025-02-22T13:00:00Z"),
        end: new Date("2025-02-22T16:00:00Z"),
      },
      {
        start: new Date("2025-02-23T14:00:00Z"),
        end: new Date("2025-02-23T18:00:00Z"),
      },
      {
        start: new Date("2025-02-24T09:30:00Z"),
        end: new Date("2025-02-24T11:30:00Z"),
      },
    ],
    quantity: 1,
    images: [
      "https://placecats.com/neo_banana/300/200",
      "https://placecats.com/neo_2/300/200",
    ],
  },
  {
    id: "2",
    name: "XLR Cables",
    description: "as above. Call me to confirm pick up",
    availability: [
      {
        start: new Date("2025-01-01T10:00:00Z"),
        end: new Date("2025-01-01T18:00:00Z"),
      },
    ],
    quantity: 10,
    images: [],
  },
];

export const spaces: Space[] = [
  {
    id: "1",
    type: "physical",
    ownerId: "1",
    name: "Main Stage",
    location: "123 Street Street",
    capacity: 200,
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
    availability: [
      {
        start: new Date("2025-02-15T10:00:00Z"),
        end: new Date("2025-02-15T15:20:00Z"),
      },
      {
        start: new Date("2025-02-16T17:00:00Z"),
        end: new Date("2025-02-16T23:00:00Z"),
      },
      {
        start: new Date("2025-02-17T10:00:00Z"),
        end: new Date("2025-02-17T10:00:00Z"),
      },
      {
        start: new Date("2025-02-18T19:00:00Z"),
        end: new Date("2025-04-18T11:59:00Z"),
      },
      {
        start: new Date("2025-02-19T10:00:00Z"),
        end: new Date("2025-02-15T19:00:00Z"),
      },
    ],
    multiBookable: false,
    booked: [],
  },
  {
    id: "2",
    type: "physical",
    ownerId: "2",
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
    availability: [
      {
        start: new Date("2025-02-01T12:10:00Z"),
        end: new Date("2025-02-01T23.15:00:00Z"),
      },
    ],
    multiBookable: false,
    booked: [],
  },
];

export const events: CalendarEvent[] = [
  {
    id: "1",
    title: "Kitty Fest 25",
    description: "A grand music festival with various artists.",
    date: "2025-01-06T14:40:02.536Z",
    start_time: "19:00",
    end_time: "21:30",
    startDate: new Date("2025-01-06T14:0:00Z"),
    endDate: new Date("2025-01-06T20:00:00Z"),
    location: {
      space: spaces[0],
      response: {
        id: "1",
        answer: "approve",
      },
    },
    image: "https://placecats.com/louie/300/200",
    tags: ["music", "festival", "cats"],
  },
  {
    id: "2",
    title: "Art Exhibition",
    description: "An exhibition showcasing modern art.",
    date: "2025-02-10T10:00:00.000Z",
    start_time: "10:00",
    end_time: "17:00",
    startDate: new Date("2025-02-10T10:00:00.000Z"),
    endDate: new Date("2025-02-10T17:00:00.000Z"),
    location: {
      space: spaces[1],
      response: {
        id: "3",
        answer: "approve",
      },
    },
    image: "https://placecats.com/bella/300/200",
    tags: ["dancing", "anarchism", "improvisation"],
  },
];

export const requests: SpaceRequest[] = [
  {
    id: "1",
    eventId: "2",
    spaceId: "2",
    message: "Require a big main stage for the big band (*-ω-)",
    response: null,
  },
  {
    id: "2",
    eventId: "2",
    spaceId: "2",
    message: "recording our album and need a good sounding studio ( ＾∇＾)",
    response: null,
  },
];
