/* ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧
  *
  * Core Types
  *
  ପ(๑•ᴗ•๑)ଓ ♡ */

type Hash = string;

type PublicKey = string;

type User = {
  id: PublicKey;
  name: string;
}

type Image = string; // url to where images/blobs are stored locally

/* ヾ( ˃ᴗ˂ )◞ • *✰
  *
  * Channel Events
  * (Backend <-> Frontend)
  *
  (ﾉ^ヮ^)ﾉ*:・ﾟ✧ */

type OperationMeta = {
  logId: {
    calendarId: Hash;
  };
  operationId: Hash;
  publicKey: PublicKey;
};

type ChannelMessage =
  | StreamMessage
  | InviteCodeReadyMessage
  | InviteCodeMessage;

type StreamMessage =
  | {
    meta: OperationMeta;
    event: "application";
    data: ApplicationMessage;
  }
  | {
    meta: OperationMeta;
    event: "error";
    data: string;
  };

type ApplicationMessage = {
  type: "EventCreated";
  data: {
    title: string;
  };
};

/* ( 'з｀)ﾉ⌒♥*:･。.
  *
  * Invite Codes
  *
  ଘ(˵╹-╹)━☆•.,¸.•* */

type InviteCodeReadyMessage = {
  event: "invite_codes_ready";
};

type InviteCodeMessage = {
  event: "invite_codes";
  data: ResolveInviteCodeRequest | ResolveInviteCodeResponse;
};

type ResolveInviteCodeRequest = {
  inviteCode: string;
  timestamp: number;
  messageType: "request";
};

type ResolveInviteCodeResponse = {
  calendarId: Hash;
  inviteCode: string;
  timestamp: number;
  messageType: "response";
};

/* (´ヮ´)八(*ﾟ▽ﾟ*)
  *
  * Calendar
  *
  *:･ﾟ✧(=✪ ᆺ ✪=)*:･ﾟ✧ */

type Calendar = {
  id: Hash;
  owner: User;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
}

type Calendars = Calendar[]

type CalendarEvent = {
  id: Hash;
  owner: User;
  name: string;
  description: string;
  location: SpaceRequest | null;
  startDate: Date; // allocated time of a space
  endDate: Date; // allocated time of a space
  publicStartDate: Date | null; // public facing
  publicEndDate: Date | null; // public facing
  resources: Resource[];
  links: Link[];
  images: Image[];
}

type Link = {
  type: "ticket" | "custom";
  title: null | string
  url: string
};

type Space = {
  id: Hash;
  type: "physical" | "gps" | "virtual";
  owner: User;
  name: string;
  location: PhysicalLocation | GPSLocation | VirtualLocation; // TODO: change to proper address structure
  capacity: number;
  accessibility: string;
  description: string;
  contact: string;
  link: Link;
  images: Image[];
  availability: TimeSpan[] | 'always';
  multiBookable: boolean; // resource can be booked more than once in the same time span
  booked: BookedTimeSpan[];
}

// TODO: TBC from open street maps
type PhysicalLocation = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string; //TODO: ISO 3166
}

type GPSLocation = {
  lat: string;
  lon: string;
};

type VirtualLocation = string;

type SpaceRequest = {
  id: Hash;
  eventId: Hash;
  spaceId: Hash;
  message: string;
  response: SpaceResponse | null;
}

type SpaceResponse = {
  id: Hash;
  request: SpaceRequest;
  answer: Answer
}

type Resource = {
  id: Hash;
  name: string;
  owner: User;
  description: string;
  contact: string;
  link: Link;
  images: Image[];
  availability: TimeSpan[] | 'always';
  multiBookable: boolean; // resource can be booked more than once in the same time span
  booked: BookedTimeSpan[];
}

type ResourceRequest = {
  id: Hash;
  resourceId: Hash;
  eventId: Hash;
  message: string;
  response: ResourceResponse | null;
}

type ResourceResponse = {
  id: Hash;
  request: ResourceRequest;
  answer: Answer;
}

type Answer = "approve" | "reject"

type TimeSpan = {
  start: Date;
  end: Date;
}

type BookedTimeSpan = TimeSpan & {
  event: Hash;
}
