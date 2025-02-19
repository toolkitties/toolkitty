export const seedMessages: ApplicationMessage[] = [
  {
    meta: {
      stream: {
        owner:
          "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
        id: "0",
        name: "calendar",
      },
      operationId: "A",
      author:
        "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
    },
    event: "application",
    data: {
      type: "calendar_created",
      data: {
        fields: {
          name: "Antiuniversity",
          dates: [
            {
              start: new Date("2025-01-20T00:00:00Z"),
              end: new Date("2025-01-27T00:00:00Z"),
            },
          ],
        },
      },
    },
  },
  {
    meta: {
      stream: {
        owner:
          "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
        id: "0",
        name: "calendar",
      },
      operationId: "B",
      author:
        "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
    },
    event: "application",
    data: {
      type: "space_created",
      data: {
        fields: {
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
          availability: [
            {
              start: new Date("2025-01-01T00:00:00Z"),
              end: new Date("2025-02-30T00:00:00Z"),
            },
          ],
          multiBookable: false,
        },
      },
    },
  },
  {
    meta: {
      stream: {
        owner:
          "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
        id: "0",
        name: "calendar",
      },
      operationId: "C",
      author:
        "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
    },
    event: "application",
    data: {
      type: "space_created",
      data: {
        fields: {
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
          availability: [
            {
              start: new Date("2025-01-01T00:00:00Z"),
              end: new Date("2025-02-30T00:00:00Z"),
            },
          ],
          multiBookable: false,
        },
      },
    },
  },
  {
    meta: {
      stream: {
        owner:
          "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
        id: "0",
        name: "calendar",
      },
      operationId: "D",
      author:
        "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
    },
    event: "application",
    data: {
      type: "resource_created",
      data: {
        fields: {
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
        },
      },
    },
  },
  {
    meta: {
      stream: {
        owner:
          "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
        id: "0",
        name: "calendar",
      },
      operationId: "E",
      author:
        "42f0cc8da959a263973a6a8fadec5c44ea679d89adee05027331670e6694727a",
    },
    event: "application",
    data: {
      type: "resource_created",
      data: {
        fields: {
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
        },
      },
    },
  },
];
//
// export const events: CalendarEvent[] = [
//   {
//     id: "1",
//     title: "Kitty Fest 25",
//     description: "A grand music festival with various artists.",
//     date: "2025-01-06T14:40:02.536Z",
//     start_time: "19:00",
//     end_time: "21:30",
//     startDate: new Date("2025-01-06T14:00:00Z"),
//     endDate: new Date("2025-01-06T20:00:00Z"),
//     location: {
//       space: {},
//       response: {
//         id: "1",
//         answer: "approve",
//       },
//     },
//     image: "https://placecats.com/louie/300/200",
//     tags: ["music", "festival", "cats"],
//   },
//   {
//     id: "2",
//     title: "Art Exhibition",
//     description: "An exhibition showcasing modern art.",
//     date: "2025-02-10T10:00:00.000Z",
//     start_time: "10:00",
//     end_time: "17:00",
//     startDate: new Date("2025-02-10T10:00:00.000Z"),
//     endDate: new Date("2025-02-10T17:00:00.000Z"),
//     location: {
//       space: spaces[1],
//       response: {
//         id: "3",
//         answer: "approve",
//       },
//     },
//     image: "https://placecats.com/bella/300/200",
//     tags: ["dancing", "anarchism", "improvisation"],
//   },
// ];
//
// export const requests: SpaceRequest[] = [
//   {
//     id: "1",
//     eventId: "2",
//     spaceId: "2",
//     message: "Require a big main stage for the big band (*-ω-)",
//     response: null,
//   },
//   {
//     id: "2",
//     eventId: "2",
//     spaceId: "2",
//     message: "recording our album and need a good sounding studio ( ＾∇＾)",
//     response: null,
//   },
// ];
