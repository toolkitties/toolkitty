import { en_GB, Faker, base, en } from "@faker-js/faker";

export const STREAM_ROOT_HASH =
  "8e7a6675a5fd2f89d7893200d39698b466fe98e3fbee30b7911c97c30bf65315";
export const CALENDAR_ID =
  "40aa69dd28f17d1adb55d560b6295c399e2fc03daa49ae015b4f5ccb151b8ac5";
export const OWNER_PUBLIC_KEY =
  "94dae7402bdf9049e96e1a02bbae97baa714c498324538f81c7b4ba0a94bf4d7";
export const NON_OWNER_PUBLIC_KEY =
  "24dae7402bdf9049e96e1a02bbae97baa714c498324538f81c7b4ba0a94bf4d7";
export const LOG_PATH = "calendar";

export const STREAM = {
  id: CALENDAR_ID,
  rootHash: STREAM_ROOT_HASH,
  owner: OWNER_PUBLIC_KEY,
};

const faker = new Faker({
  locale: [en_GB, en, base],
});

export function createCalendarMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "calendar_created" },
  fieldsOverwrites?: Partial<CalendarFields>,
): ApplicationMessage & {
  data: { type: "calendar_created" };
};
export function createCalendarMessage(
  id: Hash,
  auth: PublicKey,
  headerData: {
    type: "calendar_updated";
    calendarId: string;
    timestamp: number;
  },
  fieldsOverwrites?: Partial<CalendarFields>,
): ApplicationMessage & {
  data: { type: "calendar_updated" };
};
export function createCalendarMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "calendar_deleted"; calendarId: string },
  fieldsOverwrites?: Partial<CalendarFields>,
): ApplicationMessage & { data: { type: "calendar_deleted" } };

export function createCalendarMessage(
  id: Hash,
  author: PublicKey,
  headerData:
    | { type: "calendar_created"; timestamp?: number }
    | {
        type: "calendar_updated";
        calendarId: string;
        timestamp: number;
      }
    | {
        type: "calendar_deleted";
        calendarId: string;
        timestamp?: number;
      },
  fieldsOverwrites?: Partial<CalendarFields>,
): ApplicationMessage {
  const calendarFields = createCalendarFields(fieldsOverwrites);

  let data;
  if (headerData.type == "calendar_created") {
    data = {
      type: headerData.type,
      data: { fields: calendarFields },
    };
  } else if (headerData.type == "calendar_updated") {
    data = {
      type: headerData.type,
      data: {
        id: headerData.calendarId,
        fields: calendarFields,
      },
    };
  } else {
    data = {
      type: headerData.type,
      data: {
        id: headerData.calendarId,
      },
    };
  }
  return {
    meta: {
      operationId: id,
      author: author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: headerData.timestamp
        ? BigInt(headerData.timestamp)
        : BigInt(0),
    },
    event: "application",
    data,
  };
}

export function createEventMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "event_created"; timestamp?: number },
  fieldsOverwrites?: Partial<EventFields>,
): ApplicationMessage & { data: { type: "event_created" } };
export function createEventMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "event_updated"; eventId: string; timestamp: number },
  fieldsOverwrites?: Partial<EventFields>,
): ApplicationMessage & { data: { type: "event_updated" } };
export function createEventMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "event_deleted"; eventId: string; timestamp?: number },
  fieldsOverwrites?: Partial<EventFields>,
): ApplicationMessage & { data: { type: "event_deleted" } };

export function createEventMessage(
  id: Hash,
  author: PublicKey,
  headerData:
    | { type: "event_created"; timestamp?: number }
    | { type: "event_updated"; eventId: string; timestamp: number }
    | { type: "event_deleted"; eventId: string; timestamp?: number },
  fieldsOverwrites?: Partial<EventFields>,
): ApplicationMessage {
  const eventFields = createEventFields(fieldsOverwrites);

  let data;
  if (headerData.type == "event_created") {
    data = {
      type: headerData.type,
      data: { fields: eventFields },
    };
  } else if (headerData.type == "event_updated") {
    data = {
      type: headerData.type,
      data: {
        id: headerData.eventId,
        fields: eventFields,
      },
    };
  } else {
    data = {
      type: headerData.type,
      data: {
        id: headerData.eventId,
      },
    };
  }
  return {
    meta: {
      operationId: id,
      author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: headerData.timestamp
        ? BigInt(headerData.timestamp)
        : BigInt(0),
    },
    event: "application",
    data,
  };
}

export function createResourceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "resource_created"; timestamp?: number },
  fieldsOverwrites?: Partial<ResourceFields>,
): ApplicationMessage & { data: { type: "resource_created" } };
export function createResourceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: {
    type: "resource_updated";
    resourceId: string;
    timestamp: number;
  },
  fieldsOverwrites?: Partial<ResourceFields>,
): ApplicationMessage & { data: { type: "resource_updated" } };
export function createResourceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: {
    type: "resource_deleted";
    resourceId: string;
    timestamp?: number;
  },
  fieldsOverwrites?: Partial<ResourceFields>,
): ApplicationMessage & { data: { type: "resource_deleted" } };

export function createResourceMessage(
  id: Hash,
  author: PublicKey,
  headerData:
    | { type: "resource_created"; timestamp?: number }
    | { type: "resource_updated"; resourceId: string; timestamp: number }
    | { type: "resource_deleted"; resourceId: string; timestamp?: number },
  fieldsOverwrites?: Partial<ResourceFields>,
): ApplicationMessage {
  const resourceFields = createResourceFields(fieldsOverwrites);

  let data;
  if (headerData.type == "resource_created") {
    data = {
      type: headerData.type,
      data: { fields: resourceFields },
    };
  } else if (headerData.type == "resource_updated") {
    data = {
      type: headerData.type,
      data: {
        id: headerData.resourceId,
        fields: resourceFields,
      },
    };
  } else {
    data = {
      type: headerData.type,
      data: {
        id: headerData.resourceId,
      },
    };
  }
  return {
    meta: {
      operationId: id,
      author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: headerData.timestamp
        ? BigInt(headerData.timestamp)
        : BigInt(0),
    },
    event: "application",
    data,
  };
}

export function createSpaceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "space_created" },
  fieldsOverwrites?: Partial<SpaceFields>,
): ApplicationMessage & { data: { type: "space_created"; timestamp?: number } };
export function createSpaceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "space_updated"; spaceId: string; timestamp: number },
  fieldsOverwrites?: Partial<SpaceFields>,
): ApplicationMessage & { data: { type: "space_updated" } };
export function createSpaceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "space_deleted"; spaceId: string; timestamp?: number },
  fieldsOverwrites?: Partial<SpaceFields>,
): ApplicationMessage & { data: { type: "space_deleted" } };

export function createSpaceMessage(
  id: Hash,
  author: PublicKey,
  headerData:
    | { type: "space_created"; timestamp?: number }
    | { type: "space_updated"; spaceId: string; timestamp: number }
    | { type: "space_deleted"; spaceId: string; timestamp?: number },
  fieldsOverwrites?: Partial<SpaceFields>,
): ApplicationMessage {
  const spaceFields = createSpaceFields(fieldsOverwrites);

  let data;
  if (headerData.type == "space_created") {
    data = {
      type: headerData.type,
      data: { fields: spaceFields },
    };
  } else if (headerData.type == "space_updated") {
    data = {
      type: headerData.type,
      data: {
        id: headerData.spaceId,
        fields: spaceFields,
      },
    };
  } else {
    data = {
      type: headerData.type,
      data: {
        id: headerData.spaceId,
      },
    };
  }
  return {
    meta: {
      operationId: id,
      author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: headerData.timestamp
        ? BigInt(headerData.timestamp)
        : BigInt(0),
    },
    event: "application",
    data,
  };
}

export function createBookingRequestMessage(
  id: Hash,
  author: PublicKey,
  type: "space" | "resource",
  resourceId: Hash,
  eventId: Hash,
  timeSpan?: TimeSpan,
): ApplicationMessage {
  const start = faker.date.future();
  const end = faker.date.future({ refDate: start });
  const fakeTimeSpan = {
    start: start.toISOString(),
    end: end.toISOString(),
  };
  return {
    meta: {
      operationId: id,
      author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: BigInt(0),
    },
    event: "application",
    data: {
      type: "booking_requested",
      data: {
        type,
        resourceId,
        eventId,
        message: faker.word.words({ count: 8 }),
        timeSpan: timeSpan ? timeSpan : fakeTimeSpan,
      },
    },
  };
}

export function createBookingResponseMessage(
  id: Hash,
  author: PublicKey,
  requestId: Hash,
  response: "reject" | "accept",
): ApplicationMessage {
  return {
    meta: {
      operationId: id,
      author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: BigInt(0),
    },
    event: "application",
    data: {
      type:
        response == "accept"
          ? "booking_request_accepted"
          : "booking_request_rejected",
      data: {
        requestId,
      },
    },
  };
}

export function createAssignRoleMessage(
  id: Hash,
  author: PublicKey,
  publicKey: Hash,
  role: "organiser" | "admin",
): ApplicationMessage {
  return {
    meta: {
      operationId: id,
      author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: BigInt(0),
    },
    event: "application",
    data: {
      type: "user_role_assigned",
      data: {
        publicKey,
        role,
      },
    },
  };
}

export function createRequestAccessMessage(
  id: Hash,
  author: PublicKey,
): ApplicationMessage {
  return {
    meta: {
      operationId: id,
      author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: BigInt(0),
    },
    event: "application",
    data: {
      type: "calendar_access_requested",
      data: {
        calendarId: CALENDAR_ID,
        name: faker.animal.petName(),
        message: faker.word.words(10),
      },
    },
  };
}

export function createAccessResponseMessage(
  id: Hash,
  author: PublicKey,
  requestId: Hash,
  answer: "accept" | "reject",
): ApplicationMessage {
  let type: "calendar_access_accepted" | "calendar_access_rejected";
  if (answer === "accept") {
    type = "calendar_access_accepted";
  } else {
    type = "calendar_access_rejected";
  }
  return {
    meta: {
      operationId: id,
      author,
      stream: STREAM,
      logPath: LOG_PATH,
      timestamp: BigInt(0),
    },
    event: "application",
    data: {
      type,
      data: {
        requestId,
      },
    },
  };
}

export function createCalendarFields(
  fieldsOverwrites: Partial<CalendarFields> = {},
): CalendarFields {
  const start = faker.date.soon().toISOString();
  const end = faker.date.future({ refDate: start }).toISOString();

  const fields = {
    userName: faker.animal.cat(),
    name: faker.music.album(),
    dates: [{ start, end }],
    calendarInstructions: faker.lorem.paragraphs(10),
    spacePageText: faker.lorem.paragraphs(10),
    resourcePageText: faker.lorem.paragraphs(10),
  };

  return { ...fields, ...fieldsOverwrites };
}

export function createEventFields(
  fieldsOverwrites: Partial<EventFields> = {},
): EventFields {
  const start = faker.date.soon();
  const end = faker.date.soon({ refDate: start });

  const nameFirst = faker.animal.petName();
  const nameSecond = faker.food.adjective();
  const nameThird = faker.food.fruit();
  const fields = {
    name: `${nameFirst} ${nameSecond} ${nameThird}`,
    description: faker.commerce.productDescription(),
    spaceRequest: faker.string.hexadecimal({ length: 32 }),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    resourcesRequests: ["/toolkitty-mascot.png"],
    links: [
      {
        type: faker.helpers.arrayElement(["custom", "ticket"]),
        title: faker.company.name(),
        url: faker.internet.url(),
      },
    ],
    images: [],
  };
  return { ...fields, ...fieldsOverwrites };
}

export function createSpaceFields(
  fieldsOverwrites: Partial<SpaceFields> = {},
): SpaceFields {
  let location: PhysicalLocation | GPSLocation | VirtualLocation;
  if (fieldsOverwrites.location?.type == "physical") {
    location = {
      type: "physical",
      street: faker.location.street(),
      city: faker.location.city(),
      state: faker.location.state(),
      zip: faker.location.zipCode(),
      country: faker.location.country(),
    };
  } else if (fieldsOverwrites.location?.type == "gps") {
    location = {
      type: "gps",
      lat: faker.location.latitude(),
      lon: faker.location.longitude(),
    };
  } else {
    location = { type: "virtual", link: faker.internet.url() };
  }
  const fields = {
    name: faker.location.street(),
    location: location,
    messageForRequesters: faker.word.words(8),
    capacity: faker.number.int({ max: 1000 }),
    accessibility: faker.lorem.sentences(1),
    description: faker.lorem.sentences(4),
    contact: faker.internet.email(),
    link: {
      type: faker.helpers.arrayElement(["custom", "ticket"]),
      title: faker.company.name(),
      url: faker.internet.url(),
    },
    images: [],
    availability: faker.helpers.multiple(() => {
      const start = faker.date.soon({ days: 7 }).toISOString();
      const end = faker.date.soon({ refDate: start }).toISOString();
      return {
        start,
        end,
      };
    }),
    multiBookable: false,
  };
  return { ...fields, ...fieldsOverwrites };
}

export function createResourceFields(
  fieldsOverwrites: Partial<ResourceFields> = {},
): ResourceFields {
  const fields = {
    name: faker.commerce.product(),
    description: faker.lorem.sentences(),
    contact: faker.internet.email(),
    link: {
      type: faker.helpers.arrayElement(["custom", "ticket"]),
      title: faker.company.name(),
      url: faker.internet.url(),
    },
    images: [],
    availability: faker.helpers.multiple(() => {
      const start = faker.date.soon().toISOString();
      const end = faker.date.soon({ refDate: start }).toISOString();
      return {
        start,
        end,
      };
    }),
    multiBookable: false,
  };
  return { ...fields, ...fieldsOverwrites };
}

export function someAvailability(from: Date, to: Date) {
  return faker.helpers.multiple(
    () => {
      const start = faker.date.between({ from, to });
      start.setMinutes(0, 0, 0);
      const end = faker.date.soon({ refDate: start });
      end.setMinutes(0, 0, 0);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    },
    { count: { min: 3, max: 15 } },
  );
}
