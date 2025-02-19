export class Stream {
  private uuid: string;
  private owner: PublicKey;

  public constructor(owner: PublicKey, uuid?: string) {
    if (!uuid) {
      const crypto = new Crypto();
      uuid = crypto.randomUUID();
    }
    this.uuid = crypto.randomUUID();
    this.owner = owner;
  }

  public inbox(): StreamName {
    return {
      owner: this.owner,
      uuid: this.uuid,
      type: "inbox",
    };
  }

  public data(): StreamName {
    return {
      owner: this.owner,
      uuid: this.uuid,
      type: "data",
    };
  }
}
