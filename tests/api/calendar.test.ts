// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import { CALENDAR_ID, calendarTestMessages } from "./data";
import { calendars } from "$lib/api";
import { expect, test } from "vitest";

test("processes a calendar_created message", async () => {
  for (const message of calendarTestMessages) {
    await processMessage(message);
  }

  const calendar = await calendars.findOne(CALENDAR_ID);
  expect(calendar).toBeTruthy();
  expect(calendar!.id).toBe(CALENDAR_ID);
});
