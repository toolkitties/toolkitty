// This is required to mock the indexedDB API and must be imported at the top of the module.
import "fake-indexeddb/auto";

import { processMessage } from "$lib/processor";
import { CALENDAR_ID, seedTestMessages, OWNER_PUBLIC_KEY } from "./data";
import { calendars } from "$lib/api";
import { beforeAll, expect, test } from "vitest";
import { mockIPC } from "@tauri-apps/api/mocks";

beforeAll(async () => {
  mockIPC((cmd, args) => {
    if (cmd === "public_key") {
      return OWNER_PUBLIC_KEY;
    }
  });

  for (const message of seedTestMessages) {
    await processMessage(message);
  }
});

test("processes a calendar_created message", async () => {
  const calendar = await calendars.findOne(CALENDAR_ID);
  expect(calendar).toBeTruthy();
  expect(calendar!.id).toBe(CALENDAR_ID);
});
