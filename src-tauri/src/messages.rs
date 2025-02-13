use serde::ser::SerializeStruct;
use serde::Serialize;

use crate::node::operation::CalendarId;
use crate::node::StreamEvent;
use crate::rpc::TopicType;
use crate::topic::NetworkTopic;

#[derive(Clone, Debug)]
pub enum ChannelEvent {
    Stream(StreamEvent),
    InviteCodesReady,
    InviteCodes(serde_json::Value),
    CalendarSelected(CalendarId),
    SubscribedToCalendar(CalendarId, TopicType),
    NetworkEvent(NetworkEvent),
}

#[derive(Debug, Clone)]
pub struct NetworkEvent(pub(crate) p2panda_net::SystemEvent<NetworkTopic>);

impl Serialize for ChannelEvent {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            ChannelEvent::Stream(stream_event) => stream_event.serialize(serializer),
            ChannelEvent::InviteCodesReady => {
                let mut state = serializer.serialize_struct("StreamEvent", 1)?;
                state.serialize_field("event", "invite_codes_ready")?;
                state.end()
            }
            ChannelEvent::InviteCodes(payload) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "invite_codes")?;
                state.serialize_field("data", &payload)?;
                state.end()
            }
            ChannelEvent::CalendarSelected(calendar_id) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "calendar_selected")?;
                state.serialize_field("calendarId", &calendar_id)?;
                state.end()
            }
            ChannelEvent::SubscribedToCalendar(calendar_id, topic_type) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "subscribed_to_calendar")?;
                state.serialize_field("calendarId", &calendar_id)?;
                state.serialize_field("type", &topic_type)?;
                state.end()
            }
            ChannelEvent::NetworkEvent(ref event) => {
                let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                state.serialize_field("event", "network_event")?;
                state.serialize_field("data", event)?;
                state.end()
            }
        }
    }
}

impl Serialize for NetworkEvent {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match &self.0 {
            p2panda_net::SystemEvent::GossipJoined { topic_id, peers } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "GossipJoined")?;
                state.serialize_field("topic_id", topic_id)?;
                state.serialize_field("peers", peers)?;
                state.end()
            }
            p2panda_net::SystemEvent::GossipLeft { topic_id } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 2)?;
                state.serialize_field("type", "GossipLeft")?;
                state.serialize_field("topic_id", topic_id)?;
                state.end()
            }
            p2panda_net::SystemEvent::GossipNeighborUp { topic_id, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "GossipNeighborUp")?;
                state.serialize_field("topic_id", topic_id)?;
                state.serialize_field("peer", peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::GossipNeighborDown { topic_id, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "GossipNeighborDown")?;
                state.serialize_field("topic_id", topic_id)?;
                state.serialize_field("peer", peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::PeerDiscovered { peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 2)?;
                state.serialize_field("type", "PeerDiscovered")?;
                state.serialize_field("peer", peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::SyncStarted { topic, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "SyncStarted")?;
                state.serialize_field("topic", topic)?;
                state.serialize_field("peer", peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::SyncDone { topic, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "SyncDone")?;
                state.serialize_field("topic", topic)?;
                state.serialize_field("peer", peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::SyncFailed { topic, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "SyncFailed")?;
                state.serialize_field("topic", topic)?;
                state.serialize_field("peer", peer)?;
                state.end()
            }
        }
    }
}
