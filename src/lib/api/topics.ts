import { invoke } from "@tauri-apps/api/core";
import { identity, publish, topics } from ".";

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

export async function addAuthorToCalendar(
  publicKey: PublicKey,
  stream: Stream,
) {
  const topic = new TopicFactory(stream.id);

  await invoke("add_topic_log", {
    publicKey,
    topic: topic.calendar(),
    logId: {
      stream: stream,
      logPath: publish.CALENDAR_LOG_PATH,
    },
  });
}

export async function addAuthorToInbox(publicKey: PublicKey, stream: Stream) {
  const topic = new TopicFactory(stream.id);

  await invoke("add_topic_log", {
    publicKey,
    topic: topic.calendarInbox(),
    logId: {
      stream: stream,
      logPath: publish.CALENDAR_INBOX_LOG_PATH,
    },
  });
}

export async function subscribeToCalendar(calendarId: CalendarId) {
  const topic = new TopicFactory(calendarId);
  await invoke("subscribe_persisted", { topic: topic.calendar() });
}

export async function subscribeToInbox(calendarId: CalendarId) {
  const topic = new TopicFactory(calendarId);
  await invoke("subscribe_persisted", { topic: topic.calendarInbox() });
}

export async function subscribeEphemeral(topic: Topic) {
  await invoke("subscribe_ephemeral", { topic });
}

export async function replay(topic: Topic) {
  await invoke("replay", { topic });
}

export async function process(message: ApplicationMessage) {
  const { meta, data } = message;
  if (data.type == "calendar_created") {
    await onCalendarCreated(meta);
  }
}

async function onCalendarCreated(meta: StreamMessageMeta) {
  const myPublicKey = await identity.publicKey();
  if (meta.stream.owner == myPublicKey) {
    await topics.addAuthorToInbox(meta.stream.owner, meta.stream);
    await topics.addAuthorToCalendar(meta.stream.owner, meta.stream);
    await topics.subscribeToInbox(meta.stream.id);
    await topics.subscribeToCalendar(meta.stream.id);
  }
}
