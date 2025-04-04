/* eslint-disable @typescript-eslint/no-unused-vars */
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
  timestamp: bigint;
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

type SystemMessage = SubscribedToTopic | NetworkEvent;

/**
 * We have successfully subscribed to (but not necessarily selected) a new calendar.
 */
type SubscribedToTopic =
  | {
      event: "subscribed_to_persisted_topic";
      topic: string;
    }
  | { event: "subscribed_to_ephemeral_topic"; topic: string };

/**
 * We received a network system event from the backend node.
 */
type NetworkEvent = {
  event: "network_event";
  data:
    | GossipJoined
    | GossipLeft
    | GossipNeighborUp
    | GossipNeighborDown
    | PeerDiscovered
    | SyncStarted
    | SyncDone
    | SyncFailed;
};

type GossipJoined = {
  type: "gossip_joined";
  topic_id: string;
  peers: string[];
};

type GossipLeft = {
  type: "gossip_left";
  topic_id: string;
};

type GossipNeighborUp = {
  type: "gossip_neighbor_up";
  topic_id: string;
  peer: string;
};

type GossipNeighborDown = {
  type: "gossip_neighbor_down";
  topic_id: string;
  peer: string;
};

type PeerDiscovered = {
  type: "peer_discovered";
  peer: string;
};

type SyncStarted = {
  type: "sync_start";
  topic: string;
  peer: string;
};

type SyncDone = {
  type: "sync_done";
  topic: string;
  peer: string;
};

type SyncFailed = {
  type: "sync_failed";
  topic: string;
  peer: string;
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
  start: string;
  end: string | undefined;
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
  lat: number;
  lon: number;
};

type VirtualLocation = {
  type: "virtual";
  link: string;
};

type Answer = "accept" | "reject";

/**
 * Data fields of calendar created and updated messages.
 */
type CalendarFields = {
  /**
   * Username of the calendar creator.
   *
   * @TODO: move this out of fields into CalendarCreated event.
   */
  userName: string;

  /**
   * Name of the calendar.
   */
  name: string;

  /**
   * Dates that the calendar is "active" for.
   *
   * @TODO: use from and to dates as we don't support non-consecutive calendar dates yet.
   */
  dates: TimeSpan[];

  /**
   * Instructions for calendar users.
   */
  calendarInstructions?: string;

  /**
   * Text to be displayed on the spaces page.
   */
  spacePageText?: string;

  /**
   * Text to be displayed on the resources page.
   */
  resourcePageText?: string;
};

/**
 * Data fields of space created and updated messages.
 */
type SpaceFields = {
  /**
   * Name of the space.
   */
  name: string;

  /**
   * Location of this space, can be a physical location (with an address), a GPS location, or a
   * virtual location.
   */
  location: PhysicalLocation | GPSLocation | VirtualLocation;

  /**
   * Space capacity.
   */
  capacity: number | null;

  /**
   * Accessibility information relating to this space.
   */
  accessibility: string;

  /**
   * General description of this space.
   */
  description: string;

  /**
   * Contact details for the owner of this space.
   */
  contact: string;

  /**
   * Website or other link for this space.
   */
  link?: Link | null;

  /**
   * Message to be displayed to organisers requesting this space.
   */
  messageForRequesters: string;

  /**
   * Images of this space.
   */
  images: Image[];

  /**
   * Availability for this space as an array of timespans or the string "always" to show this
   * space is always available.
   */
  availability: TimeSpan[] | "always";

  /**
   * Boolean value denoting if multiple bookings can be made at the same time for this space.
   *
   * This might be useful for large spaces, such as parks or large halls, where multiple events
   * could happen simultaneously.
   */
  multiBookable: boolean;
};

/**
 * Data fields of resource created and updated messages.
 */
type ResourceFields = {
  /**
   * Name of this resource.
   */
  name: string;

  /**
   * Description of this resource.
   */
  description: string;

  /**
   * Contact details for the owner of this resource.
   */
  contact: string;

  /**
   * Website or other link for this resource.
   */
  link?: Link;

  /**
   * Images of this space.
   */
  images: Image[];

  /**
   * Availability for this resource as an array of timespans or the string "always" to show this
   * resource is always available.
   */
  availability: TimeSpan[] | "always";

  /**
   * Boolean value denoting if multiple bookings can be made at the same time for this resource.
   */
  multiBookable: boolean;
};

/**
 * Data fields of event created and updated messages.
 */
type EventFields = {
  /**
   * Name of this event.
   */
  name: string;

  /**
   * Description of this event.
   */
  description: string;

  /**
   * Start date and time of this event as an ISO string.
   */
  startDate: string;

  /**
   * End date and time of this event as an ISO string.
   */
  endDate: string;

  /**
   * Optional public start date and time of this event as an ISO string.
   *
   * This may be different from `startDate` when the event organiser wants to access a space early
   * before any public arrive.
   */
  publicStartDate?: string;

  /**
   * Optional public end date and time of this event as an ISO string.
   *
   * This may be different from `endDate` when the event organiser wants to leave a space after
   * later than the public.
   */
  publicEndDate?: string;

  /**
   * Ticketing or other link for this event.
   */
  link?: Link;

  /**
   * Images of this event.
   */
  images: Image[];
};

/**
 * User
 *
 * NOTE: sent on `calendar` channel
 */

/**
 * Author has updated their username.
 *
 * NOTE: currently not supported.
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

/**
 * Access to a calendar has been requested.
 */
type CalendarAccessRequested = {
  type: "calendar_access_requested";
  data: {
    /**
     * ID of the calendar the author wishes to have access to.
     */
    calendarId: Hash;

    /**
     * Name of the requesting author.
     *
     * This name will be taken as the username associated with the authors public key for this
     * calendar the access request is accepted.
     */
    name: string;

    /**
     * Message for anyone receiving this access request.
     */
    message: string;
  };
};

/**
 * A calendar access request was accepted.
 *
 * Access requests to a calendar can only be accepted by the calendar owner or a calendar admin.
 *
 * On observing a valid access request acceptance a new user is created for the relevant calendar and
 * public key. The new peer now subscribes to any relevant calendar topics and any other peers
 * observing this event should add the new peer to their calendar topic map.
 */
type CalendarAccessAccepted = {
  type: "calendar_access_accepted";
  data: {
    requestId: Hash;
  };
};

/**
 * A calendar access request was rejected.
 *
 * Access requests to a calendar can only be accepted by the calendar owner or a calendar admin.
 *
 * On observing a valid access request acceptance a new user is created for the relevant calendar and
 * public key. The new peer now subscribes to any relevant calendar topics and any other peers
 * observing this event should add the new peer to their calendar topic map.
 */
type CalendarAccessRejected = {
  type: "calendar_access_rejected";
  data: {
    requestId: Hash;
  };
};

/**
 * Calendar
 */

/**
 * A new calendar was created.
 */
type CalendarCreated = {
  type: "calendar_created";
  data: {
    fields: CalendarFields;
  };
};

/**
 * The calendar was updated.
 *
 * Only the calendar "owner" or an "admin" can update the calendar.
 */
type CalendarUpdated = {
  type: "calendar_updated";
  data: {
    /**
     * ID of the calendar that was updated.
     */
    id: Hash;
    fields: CalendarFields;
  };
};

/**
 * Text for a calendar page was updated.
 *
 * Only the calendar "owner" or an "admin" can update calendar pages.
 *
 * NOTE: not yet supported.
 */
type PageUpdated = {
  type: "page_updated";
  data: {
    id: Hash;
    page_type: "spaces" | "resources" | "about";
    description: string;
  };
};

/**
 * The calendar was deleted.
 *
 * Only the calendar "owner" or an "admin" can delete the calendar.
 */
type CalendarDeleted = {
  type: "calendar_deleted";
  data: {
    id: Hash;
  };
};

/**
 * Space
 */

/**
 * A new space was created.
 *
 * The signing author of this message is the "owner" of this space.
 */
type SpaceCreated = {
  type: "space_created";
  data: {
    fields: SpaceFields;
  };
};

/**
 * The space was updated.
 *
 * Only the space "owner" or a calendar "admin" can update a space.
 */
type SpaceUpdated = {
  type: "space_updated";
  data: {
    /**
     * ID of the space that was updated.
     */
    id: Hash;

    fields: SpaceFields;
  };
};

/**
 * The space was deleted.
 *
 * Only the space "owner" or a calendar "admin" can delete a space.
 */
type SpaceDeleted = {
  type: "space_deleted";
  data: {
    id: Hash;
  };
};

/**
 * Resource
 */

/**
 * A new resource was created.
 *
 * The signing author of this message is the "owner" of this resource.
 */
type ResourceCreated = {
  type: "resource_created";
  data: {
    fields: ResourceFields;
  };
};

/**
 * The resource was updated.
 *
 * Only the resource "owner" or a calendar "admin" can update a resource.
 */
type ResourceUpdated = {
  type: "resource_updated";
  data: {
    id: Hash;
    fields: ResourceFields;
  };
};

/**
 * The resource was deleted.
 *
 * Only the resource "owner" or a calendar "admin" can delete a resource.
 */
type ResourceDeleted = {
  type: "resource_deleted";
  data: {
    id: Hash;
  };
};

/**
 * Event
 */

/**
 * A new event was created.
 *
 * The signing author of this message is the "owner" of the event.
 */
type EventCreated = {
  type: "event_created";
  data: {
    fields: EventFields;
  };
};

/**
 * The event was updated.
 *
 * Only the event "owner" or a calendar "admin" can update an event.
 */
type EventUpdated = {
  type: "event_updated";
  data: {
    id: Hash;
    fields: EventFields;
  };
};

/**
 * The event was deleted.
 *
 * Only the event "owner" or a calendar "admin" can delete an event.
 */
type EventDeleted = {
  type: "event_deleted";
  data: {
    id: Hash;
  };
};

/**
 * Booking requests and responses
 */

/**
 * A resource or space has been requested.
 */
type BookingRequested = {
  type: "booking_requested";
  data: {
    /**
     * Does this request concern a "resource" or a "space".
     */
    type: "resource" | "space";

    /**
     * ID of the space or resource being requested.
     */
    resourceId: Hash;

    /**
     * ID of the event this resource is being requested for.
     */
    eventId: Hash;

    /**
     * Message to the resource or space owner.
     */
    message: string;

    /**
     * The timespan for which the space or resource is being requested.
     */
    timeSpan: TimeSpan;
  };
};

/**
 * A booking request has been been accepted.
 *
 * Only the owner of a space or resource can accept a booking request for it.
 */
type BookingRequestAccepted = {
  type: "booking_request_accepted";
  data: {
    /**
     * ID of the booking request which is being accepted.
     */
    requestId: Hash;
  };
};

/**
 * A booking request has been been rejected.
 *
 * Only the owner of a space or resource can reject a booking request for it.
 */
type BookingRequestRejected = {
  type: "booking_request_rejected";
  data: {
    /**
     * ID of the booking request which is being rejected.
     */
    requestId: Hash;
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
  role?: Role;
};

type Calendar = {
  id: Hash;
  ownerId: PublicKey;
  stream: Stream;
  // This field is optional as when a calendar is first created when the user subscribes to a
  // calendar stream, but at this point we haven't received the "calendar_created" message yet.
  // The `name` field becomes set when this message is received.
  name?: string;
  // TODO: Should we support non-consecutive dates? It could be arrays of TimeSpan? The
  // `CalendarCreated` fields contains a TimeSpan[] so it's possible to encode non-consecutive
  // dates there, but we don't need to support that in the app right now. Here I've left it as a
  // single time range.
  startDate?: string;
  endDate?: string;
  calendarInstructions?: string;
  spacePageText?: string;
  resourcePageText?: string;
  createdAt: bigint;
  updatedAt: bigint;
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
  createdAt: bigint;
  updatedAt: bigint;
} & EventFields;

type Space = {
  id: Hash;
  calendarId: Hash;
  ownerId: PublicKey;
  createdAt: bigint;
  updatedAt: bigint;
} & SpaceFields;

type Resource = {
  id: Hash;
  calendarId: Hash;
  ownerId: PublicKey;
  createdAt: bigint;
  updatedAt: bigint;
} & ResourceFields;

type BookingRequestStatus = "accepted" | "rejected" | "pending";

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
  isValid: "true" | "false";
  status: BookingRequestStatus;
  createdAt: bigint;
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
 *
 * Enriched data used for the UI
 */

type CalendarId = Hash;

type RequestEvent = {
  type: "booking_request" | "access_request";
  data: BookingRequest | AccessRequest;
};

type BookingQueryFilter = {
  calendarId?: CalendarId;
  eventId?: Hash;
  resourceId?: Hash;
  requester?: PublicKey;
  resourceType?: ResourceType;
  resourceOwner?: PublicKey;
  isValid?: "true" | "false";
  status?: BookingRequestStatus;
  from?: Date;
  to?: Date;
};

type CalendarEventEnriched = {
  spaceRequest?: {
    bookingRequest: BookingRequest;
    space?: Space;
  };
  resourceRequests: ResourceRequestEnriched[];
} & CalendarEvent;

type ResourceRequestEnriched = {
  bookingRequest: BookingRequest;
  resource?: Resource;
};

type BookingRequestEnriched = {
  event?: CalendarEvent;
  resource?: Resource;
  space?: Space;
} & BookingRequest;

type AccessRequestStatus =
  | "not requested yet"
  | "pending"
  | "accepted"
  | "rejected";

type OwnerResourceEnriched = {
  pendingBookingRequests?: BookingRequest[];
} & Resource;

type OwnerSpaceEnriched = {
  pendingBookingRequests?: BookingRequest[];
} & Space;
