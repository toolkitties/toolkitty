/**
 * ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧
 * Core Types
 */

/**
 * Hexadecimal-encoded BLAKE3 hash.
 */
type Hash = string;

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
type ChannelMessage =
  | StreamMessage
  | InviteCodesReadyMessage
  | InviteCodesMessage
  | SystemMessage;

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
  calendarId: Hash;
  operationId: Hash;
  publicKey: PublicKey;
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
 * We've successfully entered the p2p gossip overlay and are ready now to
 * request resolved "invite codes" or resolve them for others.
 *
 * We can only enter a gossip overlay if at least one other peer has been
 * discovered. This event indicates that we've found this first peer!
 */
type InviteCodesReadyMessage = {
  event: "invite_codes_ready";
};

/**
 * We've received an "invite codes" request or response from the network.
 */
type InviteCodesMessage = {
  event: "invite_codes";
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
  calendarId: Hash;
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
  | SpaceRequested
  | SpaceRequestAccepted
  | SpaceRequestRejected
  | SpaceRequestCancelled
  | SpaceRequestAcceptanceRevoked
  | ResourceRequested
  | ResourceRequestAccepted
  | ResourceRequestRejected
  | ResourceRequestCancelled
  | ResourceRequestAcceptanceRevoked
  | UserRoleAssigned;

/**
 * Reused types
 */

type SpaceRequestId = Hash;
type ResourceRequestId = Hash;

type CalendarFields = {
  name: string;
  dates: TimeSpan[];
};

type SpaceFields = {
  type: "physical" | "gps" | "virtual";
  name: string;
  location: PhysicalLocation | GPSLocation | VirtualLocation;
  capacity: number;
  accessibility: string;
  description: string;
  contact: string;
  link: Link;
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
  startDate: Date; // allocated time of a space
  endDate: Date; // allocated time of a space
  publicStartDate?: Date; // public facing
  publicEndDate?: Date; // public facing
  resources: ResourceRequestId[];
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

type SpaceRequested = {
  type: "space_requested";
  data: {
    eventId: Hash;
    spaceId: Hash;
    message: string;
    timePeriod: TimeSpan[];
  };
};

type SpaceRequestAccepted = {
  type: "space_request_accepted";
  data: {
    requestId: Hash;
  };
};

type SpaceRequestRejected = {
  type: "space_request_rejected";
  data: {
    requestId: Hash;
  };
};

/**
 * Message for explicitly cancelling a previously issued space request. Should not be used when a
 * request can be considered implicitly cancelled due to event deletion or other changes which may
 * impact existing requests.
 */
type SpaceRequestCancelled = {
  type: "space_request_cancelled";
  data: {
    requestId: Hash;
  };
};

/**
 * Message for explicitly revoking a previously accepted space request. Should not be used when a
 * request can be considered implicitly revoked due to space deletion or other changes which may
 * impact existing requests.
 */
type SpaceRequestAcceptanceRevoked = {
  type: "space_request_acceptance_revoked";
  data: {
    requestAcceptanceId: Hash;
  };
};

type ResourceRequested = {
  type: "resource_requested";
  data: {
    resourceId: Hash;
    eventId: Hash;
    message: string;
    timeSpan: TimeSpan;
  };
};

type ResourceRequestAccepted = {
  type: "resource_request_accepted";
  data: {
    requestId: Hash;
  };
};

type ResourceRequestRejected = {
  type: "resource_request_rejected";
  data: {
    requestId: Hash;
  };
};

/**
 * Message for explicitly cancelling a previously issued resource request. Should not be used when a
 * request can be considered implicitly cancelled due to event deletion or other changes which may
 * impact existing requests.
 */
type ResourceRequestCancelled = {
  type: "resource_request_cancelled";
  data: {
    requestId: Hash;
  };
};

/**
 * Message for explicitly revoking a previously accepted resource request. Should not be used when a
 * request can be considered implicitly revoked due to resource deletion or other changes which may
 * impact existing requests.
 */
type ResourceRequestAcceptanceRevoked = {
  type: "resource_request_acceptance_revoked";
  data: {
    requestAcceptanceId: Hash;
  };
};

/**
 * Roles
 */

type UserRoleAssigned = {
  type: "user_role_assigned";
  data: {
    publicKey: PublicKey;
    role: "publisher" | "organiser" | "admin";
  };
};

/**
 * (´ヮ´)八(*ﾟ▽ﾟ*)
 * Application Data
 */

type FlattenField<T, K extends keyof T> = Omit<T, K> & T[K];

type User = {
  id: PublicKey;
  name: string;
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
  publicKey: PublicKey;
};

type AccessResponse = {
  id: Hash;
  from: PublicKey;
  requestId: Hash;
  accept: boolean;
};

type CalendarEvent = FlattenField<
  {
    id: Hash;
    ownerId: PublicKey;
    fields: EventFields;
  },
  "fields"
>;

type Link = {
  type: "ticket" | "custom";
  title: null | string;
  url: string;
};

type Space = FlattenField<
  {
    id: Hash;
    ownerId: PublicKey;
    booked: BookedTimeSpan[];
    fields: SpaceFields;
  },
  "fields"
>;

// TODO: TBC from open street maps
type PhysicalLocation = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string; // TODO: ISO 3166
};

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
  timeSpan: TimeSpan;
  response: SpaceResponse | null;
};

type SpaceResponse = {
  id: Hash;
  request: SpaceRequest;
  answer: Answer;
};

type Resource = FlattenField<
  {
    id: Hash;
    ownerId: PublicKey;
    booked: BookedTimeSpan[];
    fields: ResourceFields;
  },
  "fields"
>;

type ResourceRequest = {
  id: Hash;
  resourceId: Hash;
  eventId: Hash;
  message: string;
  timeSpan: TimeSpan;
  response: ResourceResponse | null;
};

type ResourceResponse = {
  id: Hash;
  request: ResourceRequest;
  answer: Answer;
};

type Answer = "approve" | "reject";

type TimeSpan = {
  start: Date;
  end: Date;
};

type BookedTimeSpan = TimeSpan & {
  event: Hash;
};

type Settings = {
  name: string;
  value: Hash | string;
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
