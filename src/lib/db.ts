import Dexie, { type EntityTable, type Table } from "dexie";

/**
 * (ノ ˘_˘)ノ　ζ|||ζ　ζ|||ζ
 * Create the database
 *
 * We extend the Dexie instance with our custom table definitions for type-safety.
 * So Dexie knows how the data should look when updating or querying.
 */
const db = new Dexie("Toolkitty") as Dexie & {
  accessRequests: EntityTable<
    AccessRequest,
    "id" // primary key
  >;
  accessResponses: Table<
    AccessResponse,
    ["requestId+answer"] // primary key
  >;
  calendars: EntityTable<
    Calendar,
    "id" // primary key
  >;
  spaces: EntityTable<
    Space,
    "id" // primary key
  >;
  resources: EntityTable<
    Resource,
    "id" // primary key
  >;
  events: EntityTable<
    CalendarEvent,
    "id" // primary key
  >;
  bookingRequests: EntityTable<
    BookingRequest,
    "id" // primary key
  >;
  bookingResponses: EntityTable<
    BookingResponse,
    "id" // primary key
  >;
  streams: EntityTable<
    Stream,
    "id" // primary key
  >;
  settings: EntityTable<
    Settings,
    "name" // primary key
  >;
};

/**
 * ( ˘▽˘)っ♨
 * Declare our schemas and give them a version number
 *
 * Specify tables to be added, altered or deleted in this version.
 * For each new table we can specify a primary key and then any fields we want to index for faster queries.
 * Not all fields need to be listed here, as we declared them when creating the database.
 * For example we don't want to index images!!
 *
 * & symbol denotes that the primary key must be unique.
 */
db.version(1).stores({
  accessRequests: "&id, calendarId",
  accessResponses: "&[requestId+answer], id, calendarId",
  calendars: "&id, name, calendarId",
  spaces: "&id, calendarId",
  resources: "&id, calendarId",
  events: "&id, name, date, calendarId",
  bookingRequests: "&id, eventId, calendarId, requester, resourceType",
  bookingResponses: "&id, eventId, requestId, calendarId, answer",
  streams: "&id",
  settings: "&name",
});

export { db };
