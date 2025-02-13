import { invoke } from "@tauri-apps/api/core";
import { publicKey } from "./identity";
import { db } from "$lib/db";
import { access } from ".";

/**
 * Register that we want to sync events from an author for a certain festival. There are two
 * reasons we want to do this:
 *
 * 1) We observe a "CalendarCreated" event for a calendar we're subscribed to and want to add
 *    therefore want to sync events from the calendar creator.
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
 * Subscribe to all possible topics for all calendars we know about.
 *
 * If we don't yet have access to a calendar only the "inbox" topic is subscribed to.
 */
export async function subscribeToAll() {
  let myPublicKey = await publicKey();
  let allMyRequests = (await db.accessRequests.toArray()).filter(
    (request) => request.publicKey == myPublicKey,
  );
  let allMyCalendars = (await db.calendars.toArray()).filter(
    (calendar) => calendar.ownerId == myPublicKey,
  );

  for (const request of allMyRequests) {
    await subscribe(request.id, "inbox");

    let hasAccess = await access.checkHasAccess(
      myPublicKey,
      request.calendarId,
    );
    if (hasAccess) {
      await subscribe(request.id, "data");
    }
  }

  for (const request of allMyCalendars) {
    await subscribe(request.id, "inbox");
    await subscribe(request.id, "data");
  }
}

/**
 * Subscribe to a calendar. This tells the backend to subscribe to a particular topic type for
 * this calendar, enter gossip overlays and sync with any discovered peers. It does not effect
 * which calendar events are forwarded to the frontend.
 */
export async function subscribe(calendarId: Hash, topicType: TopicType) {
  await invoke("subscribe", { calendarId, topicType });
}
