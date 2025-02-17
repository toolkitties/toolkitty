import Dexie, { type EntityTable } from "dexie";

/**
 * (ノ ˘_˘)ノ　ζ|||ζ　ζ|||ζ
 * Create the database
 *
 * We extend the Dexie instance with our custom table definitions for type-safety.
 * So Dexie knows how the data should look when updating or querying.
 */
const db = new Dexie("CalendarDatabase") as Dexie & {
  accessRequests: EntityTable<
    AccessRequest,
    "id" // primary key
  >;
  accessResponses: EntityTable<
    AccessResponse,
    "id" // primary key
  >;
  calendars: EntityTable<
    Calendar,
    "id" // primary key
  >;
  events: EntityTable<
    CalendarEvent,
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
 */
db.version(1).stores({
  accessRequests: "&id",
  accessResponses: "&id",
  calendars: "&id, name",
  events: "&id, name, date, calendarId",
  settings: "&name",
});

export { db };
