import { invoke } from "@tauri-apps/api/core";
import { publicKey } from "./identity";
import { db } from "$lib/db";
import { access } from ".";
import { StreamFactory } from "./streams";

export const INVITE_TOPIC: string = "invite";
const CALENDAR_TOPIC_PREFIX: string = "calendar";
const CALENDAR_INBOX_TOPIC_PREFIX: string = "calendar/inbox";

const subscriptions: Set<string> = new Set();
const topicStreams: Map<Topic, Set<Stream>> = new Map();

export class TopicFactory {
  private id: Hash;

  public constructor(hash: Hash) {
    this.id = hash;
  }

  public calendar(): string {
    return `${CALENDAR_TOPIC_PREFIX}/${this.id}`;
  }

  public calendarInbox(): string {
    return `${CALENDAR_INBOX_TOPIC_PREFIX}/${this.id}`;
  }
}

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
  publicKey: PublicKey,
  topic: Topic,
  stream: Stream,
) {
  await invoke("add_topic_log", { publicKey, topic: topic, stream });
}

/**
 * Subscribe to a calendar. This tells the backend to subscribe to a particular topic type for
 * this calendar, enter gossip overlays and sync with any discovered peers. It does not effect
 * which calendar events are forwarded to the frontend.
 */
export async function subscribe(topic: Topic) {
  await invoke("subscribe", { topic });
}

/**
 * Subscribe to a calendar. This tells the backend to subscribe to a particular topic type for
 * this calendar, enter gossip overlays and sync with any discovered peers. It does not effect
 * which calendar events are forwarded to the frontend.
 */
export async function subscribe_ephemeral(topic: Topic) {
  await invoke("subscribe_ephemeral", { topic });
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
 * - "calendar/inbox"             for all calendars we requested access to
 * - "calendar/inbox" + "calendar"    for all calendars we have access to
 *
 * These are the authors we want to add to a calendar topic:
 * - "calendar/inbox"             authors who have requested access to a calendar
 * - "calendar/inbox" + "calendar"    authors who have access to a calendar
 *
 */
export async function subscribeToAll() {
  const myPublicKey = await publicKey();
  console.log(myPublicKey);
  const allRequests = await db.accessRequests.toArray();
  const allMyCalendars = (await db.calendars.toArray()).filter(
    (calendar) => calendar.ownerId == myPublicKey,
  );

  for (const request of allRequests) {
    const calendar = await db.calendars.get(request.calendarId);
    if (!calendar) {
      // We don't know about the requested calendar.
      continue;
    }

    const topic = new TopicFactory(calendar.id);
    const stream = new StreamFactory(calendar.streamOwner, calendar.streamId);
    await maybeSubscribe(
      request.publicKey,
      topic.calendarInbox(),
      stream.calendarInbox(),
    );

    const hasAccess = await access.checkHasAccess(
      request.publicKey,
      calendar.id,
    );
    if (!hasAccess) {
      continue;
    }

    await maybeSubscribe(myPublicKey, topic.calendar(), stream.calendar());
  }

  for (const calendar of allMyCalendars) {
    const stream = new StreamFactory(calendar.streamId, calendar.streamOwner);
    const topic = new TopicFactory(calendar.id);
    await maybeSubscribe(
      myPublicKey,
      topic.calendarInbox(),
      stream.calendarInbox(),
    );
    await maybeSubscribe(myPublicKey, topic.calendar(), stream.calendar());
  }
}

async function maybeSubscribe(
  publicKey: PublicKey,
  topic: Topic,
  stream: Stream,
) {
  if (!subscriptions.has(topic)) {
    subscriptions.add(topic);
    await subscribe(topic);
  }

  let streams = topicStreams.get(topic);
  if (!streams) {
    topicStreams.set(topic, new Set());
    streams = topicStreams.get(topic);
  }

  if (!streams?.has(stream)) {
    streams?.add(stream);
    await addCalendarAuthor(publicKey, topic, stream);
  }
}
