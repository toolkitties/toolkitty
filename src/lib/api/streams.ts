export const CALENDAR_STREAM_NAME = "calendar";
export const CALENDAR_INBOX_STREAM_NAME = "calendar/inbox";

export class StreamFactory {
  private id: Hash;
  private owner: PublicKey;

  public constructor(id: Hash, owner: PublicKey) {
    this.id = id;
    this.owner = owner;
  }

  public calendar(): Stream {
    return { id: this.id, owner: this.owner, name: CALENDAR_STREAM_NAME };
  }

  public calendarInbox(): Stream {
    return { id: this.id, owner: this.owner, name: CALENDAR_INBOX_STREAM_NAME };
  }
}
