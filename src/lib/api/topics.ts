import { invoke } from "@tauri-apps/api/core";
import { publicKey } from "./identity";
import { db } from "$lib/db";
import { access, publish } from ".";

const subscriptions: Set<string> = new Set();
const topicLogs: Map<Topic, Set<LogId>> = new Map();

export class TopicFactory {
  private id: Hash;

  public constructor(hash: Hash) {
    this.id = hash;
  }

  public calendar(): string {
    return `${publish.CALENDAR_TOPIC_PREFIX}/${this.id}`;
  }

  public calendarInbox(): string {
    return `${publish.CALENDAR_INBOX_TOPIC_PREFIX}/${this.id}`;
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
  logId: LogId,
) {
  await invoke("add_topic_log", { publicKey, topic: topic, logId });
}

/**
 * Subscribe to a calendar. This tells the backend to subscribe to a particular topic type for
 * this calendar, enter gossip overlays and sync with any discovered peers. It does not effect
 * which calendar events are forwarded to the frontend.
 */
export async function subscribe(topic: Topic) {
  await invoke("subscribe", { topic });
}

export async function subscribeEphemeral(topic: Topic) {
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
 * - "calendar/inbox"                 for all calendars we requested access to
 * - "calendar/inbox" + "calendar"    for all calendars we have access to
 *
 * These are the authors we want to add to a calendar topic:
 * - "calendar/inbox"                 authors who have requested access to a calendar
 * - "calendar/inbox" + "calendar"    authors who have access to a calendar
 *
 */
export async function subscribeToAll() {
  // Subscribe to the global invite topic.
  await subscribeEphemeral(publish.INVITE_TOPIC);

  const myPublicKey = await publicKey();
  const allRequests = await db.accessRequests.toArray();
  const allMyCalendars = await db.calendars.toArray()

  // Subscribe to all calendars we requested access for and add any relevant public keys + logs to the
  // topic map.
  for (const request of allRequests) {
    const calendar = await db.calendars.get(request.calendarId);
    if (!calendar) {
      // We don't know about the requested calendar.
      continue;
    }

    const stream = await db.streams.get(calendar.id);
    const topic = new TopicFactory(calendar.id);
    await maybeSubscribe(
      request.from,
      topic.calendarInbox(),
      stream!,
      publish.CALENDAR_INBOX_LOG_PATH,
    );

    const hasAccess = await access.checkHasAccess(request.from, calendar.id);
    if (!hasAccess) {
      continue;
    }

    await maybeSubscribe(
      myPublicKey,
      topic.calendar(),
      stream!,
      publish.CALENDAR_LOG_PATH,
    );
  }

  // Subscribe to all calendars we created and add our public key and logs to the topic map.
  for (const calendar of allMyCalendars) {
    const topic = new TopicFactory(calendar.id);
    const stream = await db.streams.get(calendar.id);
    await maybeSubscribe(
      myPublicKey,
      topic.calendarInbox(),
      stream!,
      publish.CALENDAR_INBOX_LOG_PATH,
    );
    await maybeSubscribe(
      myPublicKey,
      topic.calendar(),
      stream!,
      publish.CALENDAR_LOG_PATH,
    );
  }
}

async function maybeSubscribe(
  publicKey: PublicKey,
  topic: Topic,
  stream: Stream,
  logPath: LogPath,
) {
  if (!subscriptions.has(topic)) {
    subscriptions.add(topic);
    await subscribe(topic);
  }

  let logs = topicLogs.get(topic);
  if (!logs) {
    topicLogs.set(topic, new Set());
    logs = topicLogs.get(topic);
  }

  let logId = { stream, logPath };
  if (!logs?.has(logId)) {
    logs?.add(logId);
    await addCalendarAuthor(publicKey, topic, logId);
  }
}
