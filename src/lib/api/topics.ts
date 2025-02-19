import { invoke } from "@tauri-apps/api/core";
import { publicKey } from "./identity";
import { db } from "$lib/db";
import { access } from ".";

const inboxSubscriptions: Set<Hash> = new Set();
const dataSubscriptions: Set<Hash> = new Set();
const inboxAuthors: Set<PublicKey> = new Set();
const dataAuthors: Set<PublicKey> = new Set();

/**
 * Register that we want to sync events from an author for a certain festival. There are two
 * reasons we want to do this:
 *
 * 1) We observe a "CalendarCreated" event for a calendar we're subscribed to and therefore want
 *    to sync events from the calendar creator.
 * 2) We observe a "CalendarAccessAccepted" event for a calendar we're subscribed to and want to
 *    sync events from the newly added author.
 */
export async function addCalendarAuthor(
  calendarId: Hash,
  publicKey: PublicKey,
  topicType: TopicType,
) {
  await invoke("add_calendar_author", { calendarId, publicKey, topicType });
}

/**
 * Subscribe to a calendar. This tells the backend to subscribe to a particular topic type for
 * this calendar, enter gossip overlays and sync with any discovered peers. It does not effect
 * which calendar events are forwarded to the frontend.
 */
export async function subscribe(calendarId: Hash, topicType: TopicType) {
  await invoke("subscribe", { calendarId, topicType });
}

/**
 * Subscribe to all possible topics for all calendars we know about, and add authors to topics
 * when we want to sync their data. This method can be run when starting the app in order to
 * tell the node which data we want do gossip and sync.
 * 
 * Depending on if we have access or not we want to subscribe to only the inbox topic, or both the
 * inbox and data topics of a calendar. As well subscribing, we want to add ourselves and any
 * other authors to these topics, so that we actively sync their data with other peers. This
 * method does that while de-duplicating in order to avoid repeat calls to the backend.
 * 
 * These are the subscriptions we want to make:
 * - "inbox"             for all calendars we requested access to
 * - "inbox" + "data"    for all calendars we have access to
 * 
 * These are the authors we want to add to a calendar topic:
 * - "inbox"             authors who have requested access to a calendar
 * - "inbox" + "data"    authors who have access to a calendar
 * 
 */
export async function subscribeToAll() {
  let myPublicKey = await publicKey();
  let allRequests = await db.accessRequests.toArray();
  let allMyCalendars = (await db.calendars.toArray()).filter(
    (calendar) => calendar.ownerId == myPublicKey,
  );

  for (const request of allRequests) {
    await maybeSubscribe(request.publicKey, request.calendarId);
  }

  for (const calendar of allMyCalendars) {
    await maybeSubscribe(myPublicKey, calendar.id);
  }
}

async function maybeSubscribe(publicKey: PublicKey, calendarId: Hash) {
  if (!inboxSubscriptions.has(calendarId)) {
    inboxSubscriptions.add(calendarId);
    await subscribe(calendarId, "inbox");
  }

  if (!inboxAuthors.has(publicKey)) {
    inboxAuthors.add(publicKey);
    await addCalendarAuthor(calendarId, publicKey, "inbox");
  }

  let hasAccess = await access.checkHasAccess(publicKey, calendarId);

  if (!hasAccess) {
    return;
  }

  if (!dataSubscriptions.has(calendarId)) {
    dataSubscriptions.add(calendarId);
    await subscribe(calendarId, "data");
  }

  if (!dataAuthors.has(publicKey)) {
    dataAuthors.add(publicKey);
    await addCalendarAuthor(calendarId, publicKey, "data");
  }
}
