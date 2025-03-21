use p2panda_core::{Hash, PublicKey};
use serde::ser::SerializeStruct;
use serde::{Deserialize, Serialize};

use crate::node::StreamEvent;
use crate::topic::Topic;

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamArgs {
    pub(crate) id: Option<Hash>,
    pub(crate) root_hash: Option<Hash>,
    pub(crate) owner: Option<PublicKey>,
}

#[allow(clippy::large_enum_variant)]
#[derive(Clone, Debug)]
pub enum ChannelEvent {
    Stream(StreamEvent),
    SubscribedToTopic(Topic),
    NetworkEvent(NetworkEvent),
}

#[derive(Debug, Clone)]
pub struct NetworkEvent(pub(crate) p2panda_net::SystemEvent<Topic>);

impl Serialize for ChannelEvent {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            ChannelEvent::Stream(stream_event) => stream_event.serialize(serializer),
            ChannelEvent::SubscribedToTopic(topic) => match topic {
                Topic::Ephemeral(topic) => {
                    let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                    state.serialize_field("event", "subscribed_to_ephemeral_topic")?;
                    state.serialize_field("topic", &topic)?;
                    state.end()
                }
                Topic::Persisted(topic) => {
                    let mut state = serializer.serialize_struct("StreamEvent", 2)?;
                    state.serialize_field("event", "subscribed_to_persisted_topic")?;
                    state.serialize_field("topic", &topic)?;
                    state.end()
                }
            },
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
                state.serialize_field("type", "gossip_joined")?;
                state.serialize_field("topic_id", &topic_id)?;
                state.serialize_field("peers", &peers)?;
                state.end()
            }
            p2panda_net::SystemEvent::GossipLeft { topic_id } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 2)?;
                state.serialize_field("type", "gossip_left")?;
                state.serialize_field("topic_id", &topic_id)?;
                state.end()
            }
            p2panda_net::SystemEvent::GossipNeighborUp { topic_id, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "gossip_neighbor_up")?;
                state.serialize_field("topic_id", &topic_id)?;
                state.serialize_field("peer", &peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::GossipNeighborDown { topic_id, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "gossip_neighbor_up")?;
                state.serialize_field("topic_id", &topic_id)?;
                state.serialize_field("peer", &peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::PeerDiscovered { peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 2)?;
                state.serialize_field("type", "peer_discovered")?;
                state.serialize_field("peer", &peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::SyncStarted { topic, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "sync_start")?;
                state.serialize_field("topic", &topic)?;
                state.serialize_field("peer", &peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::SyncDone { topic, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "sync_done")?;
                state.serialize_field("topic", topic)?;
                state.serialize_field("peer", &peer)?;
                state.end()
            }
            p2panda_net::SystemEvent::SyncFailed { topic, peer } => {
                let mut state = serializer.serialize_struct("NetworkEvent", 3)?;
                state.serialize_field("type", "sync_failed")?;
                state.serialize_field("topic", &topic)?;
                state.serialize_field("peer", &peer)?;
                state.end()
            }
        }
    }
}
