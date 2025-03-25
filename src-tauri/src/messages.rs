use std::hash::Hash as StdHash;

use p2panda_core::{Body, Hash, Header, PublicKey};
use p2panda_node::extensions::LogId;
use p2panda_node::stream::{StreamError, StreamEvent};
use p2panda_node::topic::Topic;
use serde::ser::SerializeStruct;
use serde::{Deserialize, Serialize};

use crate::extensions::{to_log_id, Extensions, LogPath, Stream, StreamOwner, StreamRootHash};

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamArgs {
    pub(crate) id: Option<Hash>,
    pub(crate) root_hash: Option<Hash>,
    pub(crate) owner: Option<PublicKey>,
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolkittyLogId {
    pub(crate) stream: Stream,
    pub(crate) log_path: Option<LogPath>,
}

impl Into<LogId> for ToolkittyLogId {
    fn into(self) -> LogId {
        to_log_id(self.stream, self.log_path)
    }
}

#[allow(clippy::large_enum_variant)]
#[derive(Clone, Debug)]
pub enum ChannelEvent {
    Stream(ToolkittyStreamEvent),
    SubscribedToTopic(Topic),
    NetworkEvent(NetworkEvent),
}

#[allow(dead_code)]
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum ToolkittyEventData {
    Application(serde_json::Value),
    Ephemeral(serde_json::Value),
    Error(StreamError),
}

impl ToolkittyEventData {
    fn tag(&self) -> &'static str {
        match self {
            ToolkittyEventData::Application(_) => "application",
            ToolkittyEventData::Ephemeral(_) => "ephemeral",
            ToolkittyEventData::Error(_) => "error",
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ToolkittyStreamEvent {
    pub meta: Option<ToolkittyEventMeta>,
    pub data: ToolkittyEventData,
}

impl From<StreamEvent<Extensions>> for ToolkittyStreamEvent {
    fn from(value: StreamEvent<Extensions>) -> Self {
        match value.data {
            p2panda_node::stream::EventData::Application(bytes) => {
                ToolkittyStreamEvent::from_operation(
                    value.header.expect("application message has header"),
                    Body::new(&bytes),
                )
            }
            p2panda_node::stream::EventData::Ephemeral(bytes) => {
                ToolkittyStreamEvent::from_bytes(bytes)
            }
            p2panda_node::stream::EventData::Error(stream_error) => {
                ToolkittyStreamEvent::from_error(
                    stream_error,
                    value.header.expect("stream error message has header"),
                )
            }
        }
    }
}

impl ToolkittyStreamEvent {
    pub fn from_operation(header: Header<Extensions>, body: Body) -> Self {
        let json = serde_json::from_slice(&body.to_bytes()).unwrap();

        Self {
            meta: Some(header.into()),
            data: ToolkittyEventData::Application(json),
        }
    }

    pub fn from_bytes(payload: Vec<u8>) -> Self {
        let json = serde_json::from_slice(&payload).unwrap();

        Self {
            meta: None,
            data: ToolkittyEventData::Ephemeral(json),
        }
    }

    #[allow(dead_code)]
    pub fn from_error(error: StreamError, header: Header<Extensions>) -> Self {
        Self {
            meta: Some(header.into()),
            data: ToolkittyEventData::Error(error),
        }
    }
}

impl Serialize for ToolkittyStreamEvent {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("StreamEvent", 3)?;
        state.serialize_field("event", &self.data.tag())?;
        state.serialize_field("meta", &self.meta)?;
        state.serialize_field("data", &self.data)?;
        state.end()
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamMeta {
    pub(crate) id: Hash,
    pub(crate) root_hash: StreamRootHash,
    pub(crate) owner: StreamOwner,
}

impl From<Stream> for StreamMeta {
    fn from(stream: Stream) -> Self {
        StreamMeta {
            id: stream.id(),
            root_hash: stream.root_hash,
            owner: stream.owner,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolkittyEventMeta {
    pub operation_id: Hash,
    pub author: PublicKey,
    pub stream: StreamMeta,
    pub log_path: Option<LogPath>,
}

impl From<Header<Extensions>> for ToolkittyEventMeta {
    fn from(header: Header<Extensions>) -> Self {
        let stream: Stream = header.extension().expect("extract stream id extensions");
        let log_path: Option<LogPath> = header.extension();

        Self {
            operation_id: header.hash(),
            author: header.public_key,
            stream: stream.into(),
            log_path,
        }
    }
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
