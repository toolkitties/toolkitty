import { en_GB, de, fr, Faker, base, en } from "@faker-js/faker";
import { LOG_PATH, STREAM } from "./data";

const faker = new Faker({
  locale: [en_GB, de, fr, en, base],
});

export function createCalendarMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "calendar_created" },
  fieldsOverwrites?: Partial<CalendarFields>,
): ApplicationMessage & { data: { type: "calendar_created" } };
export function createCalendarMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "calendar_updated"; calendarId: string },
  fieldsOverwrites?: Partial<CalendarFields>,
): ApplicationMessage & { data: { type: "calendar_updated" } };
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
    | { type: "calendar_created" }
    | {
        type: "calendar_updated";
        calendarId: string;
      }
    | {
        type: "calendar_deleted";
        calendarId: string;
      },
  fieldsOverwrites?: Partial<CalendarFields>,
): ApplicationMessage {
  const calendarFields = { ...createCalendarFields(), ...fieldsOverwrites };

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
    },
    event: "application",
    data,
  };
}

export function createEventMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "event_created" },
  fieldsOverwrites?: Partial<EventFields>,
): ApplicationMessage & { data: { type: "event_created" } };
export function createEventMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "event_updated"; eventId: string },
  fieldsOverwrites?: Partial<EventFields>,
): ApplicationMessage & { data: { type: "event_updated" } };
export function createEventMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "event_deleted"; eventId: string },
  fieldsOverwrites?: Partial<EventFields>,
): ApplicationMessage & { data: { type: "event_deleted" } };

export function createEventMessage(
  id: Hash,
  author: PublicKey,
  headerData:
    | { type: "event_created" }
    | { type: "event_updated"; eventId: string }
    | { type: "event_deleted"; eventId: string },
  fieldsOverwrites?: Partial<EventFields>,
): ApplicationMessage {
  const eventFields = { ...createEventFields(), ...fieldsOverwrites };

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
    },
    event: "application",
    data,
  };
}

export function createResourceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "resource_created" },
  fieldsOverwrites?: Partial<ResourceFields>,
): ApplicationMessage & { data: { type: "resource_created" } };
export function createResourceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "resource_updated"; resourceId: string },
  fieldsOverwrites?: Partial<ResourceFields>,
): ApplicationMessage & { data: { type: "resource_updated" } };
export function createResourceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "resource_deleted"; resourceId: string },
  fieldsOverwrites?: Partial<ResourceFields>,
): ApplicationMessage & { data: { type: "resource_deleted" } };

export function createResourceMessage(
  id: Hash,
  author: PublicKey,
  headerData:
    | { type: "resource_created" }
    | { type: "resource_updated"; resourceId: string }
    | { type: "resource_deleted"; resourceId: string },
  fieldsOverwrites?: Partial<ResourceFields>,
): ApplicationMessage {
  const resourceFields = { ...createResourceFields(), ...fieldsOverwrites };

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
): ApplicationMessage & { data: { type: "space_created" } };
export function createSpaceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "space_updated"; spaceId: string },
  fieldsOverwrites?: Partial<SpaceFields>,
): ApplicationMessage & { data: { type: "space_updated" } };
export function createSpaceMessage(
  id: Hash,
  auth: PublicKey,
  headerData: { type: "space_deleted"; spaceId: string },
  fieldsOverwrites?: Partial<SpaceFields>,
): ApplicationMessage & { data: { type: "space_deleted" } };

export function createSpaceMessage(
  id: Hash,
  author: PublicKey,
  headerData:
    | { type: "space_created" }
    | { type: "space_updated"; spaceId: string }
    | { type: "space_deleted"; spaceId: string },
  fieldsOverwrites?: Partial<SpaceFields>,
): ApplicationMessage {
  const spaceFields = { ...createSpaceFields(), ...fieldsOverwrites };

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
    },
    event: "application",
    data,
  };
}

export function createCalendarFields(): CalendarFields {
  const start = faker.date.soon();
  const end = faker.date.soon({ refDate: start });

  return {
    name: faker.company.buzzPhrase(),
    dates: [{ start, end }],
    festivalInstructions: null,
    spacePageText: null,
    resourcePageText: null,
  };
}

export function createEventFields(): EventFields {
  const start = faker.date.soon();
  const end = faker.date.soon({ refDate: start });

  return {
    name: faker.company.buzzPhrase(),
    description: faker.commerce.productDescription(),
    spaceRequest: faker.string.hexadecimal({ length: 32 }),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    resourcesRequests: faker.helpers.multiple(() =>
      faker.string.hexadecimal({ length: 32 }),
    ),
    links: [
      {
        type: faker.helpers.arrayElement(["custom", "ticket"]),
        title: faker.company.name(),
        url: faker.internet.url(),
      },
    ],
    images: faker.helpers.multiple(() =>
      faker.string.hexadecimal({ length: 32 }),
    ),
  };
}

export function createSpaceFields(): SpaceFields {
  return {
    name: faker.commerce.department(),
    location: {
      type: "physical",
      street: faker.location.street(),
      city: faker.location.city(),
      state: faker.location.state(),
      zip: faker.location.zipCode(),
      country: faker.location.country(),
    },
    messageForRequesters: faker.lorem.sentences(),
    capacity: faker.number.int({ max: 1000 }),
    accessibility: faker.lorem.sentences(),
    description: faker.lorem.sentences(),
    contact: faker.internet.email(),
    link: {
      type: faker.helpers.arrayElement(["custom", "ticket"]),
      title: faker.company.name(),
      url: faker.internet.url(),
    },
    images: faker.helpers.multiple(() =>
      faker.string.hexadecimal({ length: 32 }),
    ),
    availability: faker.helpers.multiple(() => {
      const start = faker.date.future();
      const end = faker.date.future({ refDate: start });
      return {
        start,
        end,
      };
    }),
    multiBookable: false,
  };
}

export function createResourceFields(): ResourceFields {
  return {
    name: faker.commerce.department(),
    description: faker.lorem.sentences(),
    contact: faker.internet.email(),
    link: {
      type: faker.helpers.arrayElement(["custom", "ticket"]),
      title: faker.company.name(),
      url: faker.internet.url(),
    },
    images: faker.helpers.multiple(() =>
      faker.string.hexadecimal({ length: 32 }),
    ),
    availability: faker.helpers.multiple(() => {
      const start = faker.date.future();
      const end = faker.date.future({ refDate: start });
      return {
        start,
        end,
      };
    }),
    multiBookable: false,
  };
}
