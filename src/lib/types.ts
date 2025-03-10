/**
 * ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧
 * Core Types
 */

/**
 * Hexadecimal-encoded BLAKE3 hash.
 */
type Hash = string;

/**
 * The hash identifier of a stream.
 */
type StreamId = Hash;

/**
 * The hash identifier of a single operation.
 */
type OperationId = Hash;

/**
 * A topic which can be subscribed to on the network layer.
 */
type Topic = string;

/**
 * A long-lived "owned" data stream.
 */
type Stream = {
  id: StreamId;
  rootHash: Hash;
  owner: PublicKey;
};

type LogId = {
  stream: Stream;
  logPath: LogPath;
};

/**
 * The path portion of a log id.
 */
type LogPath = "calendar" | "calendar/inbox";

/**
 * Hexadecimal-encoded Ed25519 public key.
 */
type PublicKey = string;

/**
 * URL to where images (blobs) are served from locally via HTTP.
 */
type Image = string;

/**
 *ヾ( ˃ᴗ˂ )◞ • *✰
 * Channel Messages
 */

/**
 * Messages received from the "backend -> frontend" channel.
 *
 * Not all messages sent on this channel come from the same source, some
 * represent actual application events which are persisted and synced from
 * other peers, some others are "ephemeral" messages, some others are "system
 * events" informing us about changes in the backend.
 *
 * Channels can be established with help of the Tauri API to allow a
 * one-directional communication interface between the backend and frontend.
 *
 * Read more here: https://v2.tauri.app/develop/calling-frontend/#channels
 */
type ChannelMessage = StreamMessage | EphemeralMessage | SystemMessage;

/**
 * ଘ(˵╹-╹)━☆•.,¸.•*
 * Stream Processor
 */

/**
 * Messages coming from the backend stream processor.
 *
 * These messages result from p2panda operations which are processed by the
 * backend stream pipeline. Their payloads are forwarded to the frontend in form
 * of "application messages".
 *
 * If an error occurred during stream processing, the error message is
 * forwarded to the frontend, in case it makes sense to show an error to the
 * user, etc.
 */
type StreamMessage = ApplicationMessage | StreamErrorMessage;

/**
 * Something went wrong when processing this p2panda operation in the backend.
 */
type StreamErrorMessage = {
  meta: StreamMessageMeta;
  event: "error";
  data: string;
};

/**
 * Application messages are passed to the frontend from the backend. They
 * contain the payload of an p2panda operation which was either created by our
 * peer or received from a remote peer via the p2p network.
 *
 * The payloads are "application events" which represent the "actual data" of
 * this application. Every event informs the application that some state has
 * changed (similar to "event sourcing" or "stream processing" patterns).
 *
 * At this stage we can assume that messages have been processed by the backend
 * stream pipeline, which means they are persisted, validated in terms of
 * cryptographic integrity and causally ordered so we can reason about the order
 * of events in a distributed system.
 *
 * Since the frontend applies additional processing steps we can't assume yet
 * that these messages are "correct". All additional "application logic" still
 * needs to be applied. We can see the processing pipeline as a whole, spanning
 * from backend to frontend.
 *
 * Every application message needs to be explicitly "acknowledged" after it has
 * been successfully processed by the frontend. Acks inform the backend that it
 * doesn't need to re-send this message again next time the process starts.
 */
type ApplicationMessage = {
  meta: StreamMessageMeta;
  event: "application";
  data: ApplicationEvent;
};

/**
 * Additional data we've received from the processed p2panda operation.
 */
type StreamMessageMeta = {
  operationId: Hash;
  author: PublicKey;
  stream: Stream;
  logPath: LogPath;
};

/**
 * o( ❛ᴗ❛ )o
 * System Messages
 */

/**
 * System messages occur when an action or event occurred on our own node, they don't represent
 * messages passed around the network. They can be the result of a command being called or some
 * backend state change.
 */

type SystemMessage = CalendarSelected | SubscribedToCalendar | NetworkEvent;

/**
 * We have selected a new calendar and are ready to receive it's events.
 */
type CalendarSelected = {
  event: "calendar_selected";
  calendarId: string;
};

/**
 * We have successfully subscribed to (but not necessarily selected) a new calendar.
 */
type SubscribedToCalendar = {
  event: "subscribed_to_calendar";
  calendarId: string;
};

/**
 * We received a network system event from the backend node.
 */
type NetworkEvent = {
  event: "network_event";
  // @TODO: define all possible system events we will receive on the frontend
  data: any;
};

/**
 * ( 'з｀)ﾉ⌒♥*:･。.
 * Invite Codes
 */

/**
 * We've received an "invite codes" request or response from the network.
 */
type EphemeralMessage = {
  event: "ephemeral";
  data: ResolveInviteCodeRequest | ResolveInviteCodeResponse;
};

/**
 * Message requesting to resolve an invite code to all calendar data the peer
 * needs to join.
 */
type ResolveInviteCodeRequest = {
  messageType: "request";
  timestamp: number;
  inviteCode: string;
};

/**
 * Message responding with resolved calendar data, answering the initial
 * request of another peer.
 */
type ResolveInviteCodeResponse = {
  messageType: "response";
  timestamp: number;
  inviteCode: string;
  calendarStream: Stream;
  calendarName: string;
};

/**
 * ヾ( ˃ᴗ˂ )◞ • *✰
 * Our Protocol!!!
 */

/**
 * All events our application can create, send or receive on the network.
 *
 * Every event is processed by our application. We can learn about newly
 * created, changed or deleted application data from these events and can
 * accordingly adjust our local state in an "event sourcing" manner.
 *
 * As soon as we've "processed", "materialized" or "indexed" (there's many
 * similar words for this), we've created or changed our application data
 * which is further defined below.
 */

type ApplicationEvent =
  | UserProfileUpdated
  | CalendarCreated
  | CalendarUpdated
  | CalendarDeleted
  | CalendarAccessRequested
  | CalendarAccessAccepted
  | CalendarAccessRejected
  | CalendarAccessRejected
  | PageUpdated
  | SpaceCreated
  | SpaceUpdated
  | SpaceDeleted
  | ResourceCreated
  | ResourceUpdated
  | ResourceDeleted
  | EventCreated
  | EventUpdated
  | EventDeleted
  | BookingRequested
  | BookingRequestAccepted
  | BookingRequestRejected
  | BookingRequestCancelled
  | BookingRequestAcceptanceRevoked
  | UserRoleAssigned;

/**
 * Reused types
 */

type SpaceRequestId = Hash;
type ReservationRequestId = Hash;

type Link = {
  type: "ticket" | "custom";
  title: null | string;
  url: string;
};

type TimeSpan = {
  start: Date;
  end: Date;
};

type BookedTimeSpan = TimeSpan & {
  event: Hash;
};

// TODO: TBC from open street maps
type PhysicalLocation = {
  type: "physical";
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string; // TODO: ISO 3166
};

type GPSLocation = {
  type: "gps";
  lat: string;
  lon: string;
};

type VirtualLocation = {
  type: "virtual";
  link: string;
};

type Answer = "accept" | "reject";

type CalendarFields = {
  name: string;
  dates: TimeSpan[];
  festivalInstructions: string | null;
  spacePageText: string | null;
  resourcePageText: string | null;
};

type SpaceFields = {
  name: string;
  location: PhysicalLocation | GPSLocation | VirtualLocation;
  capacity: number | null;
  accessibility: string;
  description: string;
  contact: string;
  link: Link | null;
  messageForRequesters: string;
  images: Image[];
  availability: TimeSpan[] | "always";
  multiBookable: boolean;
};

type ResourceFields = {
  name: string;
  description: string;
  contact: string;
  link: Link;
  images: Image[];
  availability: TimeSpan[] | "always";
  multiBookable: boolean;
};

type EventFields = {
  name: string;
  description: string;
  location?: SpaceRequestId; // ref to a space
  startDate: string; // allocated time of a space
  endDate: string; // allocated time of a space
  publicStartDate?: string; // public facing
  publicEndDate?: string; // public facing
  resources?: ReservationRequestId[];
  links: Link[];
  images: Image[];
};

/**
 * User
 *
 * NOTE: sent on `inbox` channel
 */

type UserProfileUpdated = {
  type: "user_profile_updated";
  data: {
    name: string;
  };
};

/**
 * Access
 *
 * NOTE: sent on `inbox` channel
 */

type CalendarAccessRequested = {
  type: "calendar_access_requested";
  data: {
    calendarId: Hash;
    name: string;
    message: string;
  };
};

type CalendarAccessAccepted = {
  type: "calendar_access_accepted";
  data: {
    requestId: Hash;
  };
};

type CalendarAccessRejected = {
  type: "calendar_access_rejected";
  data: {
    requestId: Hash;
  };
};

/**
 * Calendar
 */

type CalendarCreated = {
  type: "calendar_created";
  data: {
    fields: CalendarFields;
  };
};

type CalendarUpdated = {
  type: "calendar_updated";
  data: {
    id: Hash;
    fields: CalendarFields;
  };
};

type PageUpdated = {
  type: "page_updated";
  data: {
    id: Hash;
    page_type: "spaces" | "resources" | "about";
    description: string;
  };
};

type CalendarDeleted = {
  type: "calendar_deleted";
  data: {
    id: Hash;
  };
};

/**
 * Space
 */

type SpaceCreated = {
  type: "space_created";
  data: {
    fields: SpaceFields;
  };
};

type SpaceUpdated = {
  type: "space_updated";
  data: {
    id: Hash;
    fields: SpaceFields;
  };
};

type SpaceDeleted = {
  type: "space_deleted";
  data: {
    id: Hash;
  };
};

/**
 * Resource
 */

type ResourceCreated = {
  type: "resource_created";
  data: {
    fields: ResourceFields;
  };
};

type ResourceUpdated = {
  type: "resource_updated";
  data: {
    id: Hash;
    fields: ResourceFields;
  };
};

type ResourceDeleted = {
  type: "resource_deleted";
  data: {
    id: Hash;
  };
};

/**
 * Event
 */

type EventCreated = {
  type: "event_created";
  data: {
    fields: EventFields;
  };
};

type EventUpdated = {
  type: "event_updated";
  data: {
    id: Hash;
    fields: EventFields;
  };
};

type EventDeleted = {
  type: "event_deleted";
  data: {
    id: Hash;
  };
};

/**
 * Requests and responses
 */

type BookingRequested = {
  type: "booking_requested";
  data: {
    type: "resource" | "space";
    resourceId: Hash;
    eventId: Hash;
    message: string;
    timeSpan: TimeSpan;
  };
};

type BookingRequestAccepted = {
  type: "booking_request_accepted";
  data: {
    requestId: Hash;
  };
};

type BookingRequestRejected = {
  type: "booking_request_rejected";
  data: {
    requestId: Hash;
  };
};

/**
 * Message for explicitly cancelling a previously issued resource request. Should not be used when a
 * request can be considered implicitly cancelled due to event deletion or other changes which may
 * impact existing requests.
 */
type BookingRequestCancelled = {
  type: "booking_request_cancelled";
  data: {
    requestId: Hash;
  };
};

/**
 * Message for explicitly revoking a previously accepted resource request. Should not be used when a
 * request can be considered implicitly revoked due to resource deletion or other changes which may
 * impact existing requests.
 */
type BookingRequestAcceptanceRevoked = {
  type: "booking_request_acceptance_revoked";
  data: {
    requestAcceptanceId: Hash;
  };
};

/**
 * Roles
 */

type Role = "organiser" | "admin";

type UserRoleAssigned = {
  type: "user_role_assigned";
  data: {
    publicKey: PublicKey;
    role: Role;
  };
};

/**
 * The different subscription types which exist for a calendar. Each represents a logical set of
 * data which can be subscribed to independently.
 */
type TopicType = "inbox" | "data";

type Subscription = {
  calendarId: Hash;
  type: TopicType;
};

/**
 * (´ヮ´)八(*ﾟ▽ﾟ*)
 * Database Schema
 *
 * How the data looks that we store in the frontend indexed db.
 */

type User = {
  publicKey: PublicKey;
  calendarId: CalendarId;
  // @TODO: currently this value is undefined for calendar creators: https://github.com/toolkitties/toolkitty/issues/177
  name?: string;
  role?: Role
};

type Calendar = {
  id: Hash;
  ownerId: PublicKey;
  name: string;
  // TODO: Should we support non-consecutive dates? It could be arrays of TimeSpan? The
  // `CalendarCreated` fields contains a TimeSpan[] so it's possible to encode non-consecutive
  // dates there, but we don't need to support that in the app right now. Here I've left it as a
  // single time range.
  startDate: Date;
  endDate?: Date;
};

type AccessRequest = {
  id: Hash;
  calendarId: Hash;
  from: PublicKey;
  name: string;
  message: string;
};

type AccessResponse = {
  id: Hash;
  calendarId: Hash;
  from: PublicKey;
  requestId: Hash;
  answer: Answer;
};

type CalendarEvent = {
  id: Hash;
  calendarId: Hash;
  ownerId: PublicKey;
} & EventFields;

type Space = {
  id: Hash;
  calendarId: Hash;
  ownerId: PublicKey;
  booked: BookedTimeSpan[];
} & SpaceFields;

type Resource = {
  id: Hash;
  calendarId: Hash;
  ownerId: PublicKey;
  booked: BookedTimeSpan[];
} & ResourceFields;

type BookingRequest = {
  id: Hash;
  calendarId: Hash;
  eventId: Hash;
  requester: PublicKey;
  resourceId: Hash;
  resourceType: ResourceType;
  resourceOwner: PublicKey;
  message: string;
  timeSpan: TimeSpan;
};

type ResourceType = "space" | "resource";

type BookingResponse = {
  id: Hash;
  calendarId: Hash;
  eventId: Hash;
  requestId: Hash;
  responder: PublicKey;
  answer: Answer;
};

type Settings = {
  name: string;
  value: Hash | string;
};

/**
 * (´ヮ´)八(*ﾟ▽ﾟ*)
 * Application Data
 */

type CalendarId = Hash;

type RequestEvent = {
  type: "booking_request" | "access_request";
  data: BookingRequest | AccessRequest;
};

type BookingQueryFilter = {
  eventId?: Hash;
  requester?: PublicKey;
  resourceType?: ResourceType;
  resourceOwner?: PublicKey;
};
