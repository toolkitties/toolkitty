import Dexie, { type EntityTable } from "dexie";

// create the database instance
const db = new Dexie("CalendarDatabase") as Dexie & {
  calendars: EntityTable<
    Calendar,
    "id" // primary key "id" (for the typings only)
  >;
  events: EntityTable<
    CalendarEvent,
    "id" // primary key "id" (for the typings only)
  >;
};

// Schema declaration:
db.version(1).stores({
  calendars: "id, name", // primary key "id" (for the runtime!)
  events: "id, name, date, calendarId",
});

export { db };
