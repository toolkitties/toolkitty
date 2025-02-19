import { invoke } from "@tauri-apps/api/core";
import { publicKey } from "./identity";
import { db } from "$lib/db";
import { access } from ".";
import { Stream } from "./streams";

export const INVITE_TOPIC: string = "invite";
const INBOX_TOPIC_PREFIX: string = "inbox";
const DATA_TOPIC_PREFIX: string = "data";

const subscriptions: Set<string> = new Set();
const topicStreams: Map<TopicName, Set<StreamName>> = new Map();

export class Topic {
  private id: Hash;

  public constructor(hash: Hash) {
    this.id = hash;
  }

  public inbox(): string {
    return `${INBOX_TOPIC_PREFIX}-${this.id}`;
  }

  public data(): string {
    return `${DATA_TOPIC_PREFIX}-${this.id}`;
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
  topicName: TopicName,
  streamName: StreamName,
) {
  await invoke("add_topic_log", { publicKey, topic: topicName, streamName });
}

/**
 * Subscribe to a calendar. This tells the backend to subscribe to a particular topic type for
 * this calendar, enter gossip overlays and sync with any discovered peers. It does not effect
 * which calendar events are forwarded to the frontend.
 */
export async function subscribe(topic: TopicName) {
  await invoke("subscribe", { topic });
}

/**
 * Subscribe to a calendar. This tells the backend to subscribe to a particular topic type for
 * this calendar, enter gossip overlays and sync with any discovered peers. It does not effect
 * which calendar events are forwarded to the frontend.
 */
export async function subscribe_ephemeral(topic: TopicName) {
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
 * - "inbox"             for all calendars we requested access to
 * - "inbox" + "data"    for all calendars we have access to
 *
 * These are the authors we want to add to a calendar topic:
 * - "inbox"             authors who have requested access to a calendar
 * - "inbox" + "data"    authors who have access to a calendar
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

    const topic = new Topic(calendar.id);
    const stream = new Stream(calendar.streamOwner, calendar.streamId);
    await maybeSubscribe(request.publicKey, topic.inbox(), stream.inbox());

    const hasAccess = await access.checkHasAccess(
      request.publicKey,
      calendar.id,
    );
    if (!hasAccess) {
      continue;
    }

    await maybeSubscribe(myPublicKey, topic.data(), stream.data());
  }

  for (const calendar of allMyCalendars) {
    const stream = new Stream(calendar.streamOwner, calendar.streamId);
    const topic = new Topic(calendar.id);
    await maybeSubscribe(myPublicKey, topic.inbox(), stream.inbox());
    await maybeSubscribe(myPublicKey, topic.data(), stream.data());
  }
}

async function maybeSubscribe(
  publicKey: PublicKey,
  topic: TopicName,
  streamName: StreamName,
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

  if (!streams?.has(streamName)) {
    streams?.add(streamName);
    await addCalendarAuthor(publicKey, topic, streamName);
  }
}
