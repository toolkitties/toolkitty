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

type SystemMessage = CalendarSelected
  | SubscribedToCalendar
  | NetworkEvent;

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
type ApplicationEvent = CalendarCreatedEvent;

type CalendarCreatedEvent = {
  type: "calendar_created";
  data: {
    name: string;
    startDate?: string;
    endDate?: string;
  };
};

/**
 * (´ヮ´)八(*ﾟ▽ﾟ*)
 * Application Data
 */

type User = {
  id: PublicKey;
  name: string;
};

type Calendar = {
  id: Hash;
  ownerId: PublicKey;
  name: string;
  // TODO: Should we support non-consecutive dates? It could be arrays of TimeSpan?
  startDate?: Date;
  endDate?: Date;
};

type CalendarEvent = {
  id: Hash;
  ownerId: PublicKey;
  name: string;
  description: string;
  location: SpaceRequest | null;
  startDate: Date; // allocated time of a space
  endDate: Date; // allocated time of a space
  publicStartDate: Date | null; // public facing
  publicEndDate: Date | null; // public facing
  resources: ResourceRequest[];
  links: Link[];
  images: Image[];
};

type Link = {
  type: "ticket" | "custom";
  title: null | string;
  url: string;
};

type Space = {
  id: Hash;
  type: "physical" | "gps" | "virtual";
  ownerId: PublicKey;
  name: string;
  location: PhysicalLocation | GPSLocation | VirtualLocation; // TODO: change to proper address structure
  capacity: number;
  accessibility: string;
  description: string;
  contact: string;
  link: Link;
  images: Image[];
  availability: TimeSpan[] | "always";
  multiBookable: boolean; // Resource can be booked more than once in the same time span
  booked: BookedTimeSpan[];
};

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
  response: SpaceResponse | null;
};

type SpaceResponse = {
  id: Hash;
  request: SpaceRequest;
  answer: Answer;
};

type Resource = {
  id: Hash;
  name: string;
  ownerId: PublicKey;
  description: string;
  contact: string;
  link: Link;
  images: Image[];
  availability: TimeSpan[] | "always";
  multiBookable: boolean; // resource can be booked more than once in the same time span
  booked: BookedTimeSpan[];
};

type ResourceRequest = {
  id: Hash;
  resourceId: Hash;
  eventId: Hash;
  message: string;
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
}