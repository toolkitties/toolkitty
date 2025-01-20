use std::fmt::Display;
use std::hash::Hash as StdHash;
use std::time::SystemTime;

use p2panda_core::cbor::{decode_cbor, encode_cbor, DecodeError, EncodeError};
use p2panda_core::{Body, Extension, Hash, Header, PrivateKey, PruneFlag, PublicKey};
use p2panda_store::{LocalLogStore, MemoryStore};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub enum MessageType {
    Calendar,
    Event,
    Resource,
}

impl Display for MessageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let str = match self {
            MessageType::Calendar => "calendar",
            MessageType::Event => "event",
            MessageType::Resource => "resource",
        };

        write!(f, "{str}")
    }
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarId(pub Hash);

/// Metadata giving information about the stream this operation is associated with.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamMeta {
    /// The owner of this stream (the peer who published the first message).
    pub owner: PublicKey,

    /// Message types expected on this stream.
    pub message_type: MessageType,

    /// UNIX timestamp when the stream was created.
    pub created_at: u64,
}

impl StreamMeta {
    pub fn log_id(&self) -> LogId {
        LogId::new(self.owner, self.message_type, self.created_at)
    }
}

/// A locally unique identifier for a log.
/// 
/// A log id must be derived _before_ an operation is constructed, for this reason it can't be the
/// the hash of the operation itself. We derive the log id string from metadata attached to the
/// stream is part of: `<OWNER_PUBLIC_KEY>/<MESSAGE_TYPE>/<CREATED_AT_TIMESTAMP>`.
/// 
/// This introduces enough uniqueness that no two log ids should be the same.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogId(String);

impl LogId {
    pub fn new(public_key: PublicKey, message_type: MessageType, timestamp: u64) -> Self {
        Self(format!("{}/{}/{}", public_key, message_type, timestamp))
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Extensions {
    #[serde(rename = "c")]
    calendar_id: Option<CalendarId>,

    #[serde(rename = "s")]
    stream_meta: StreamMeta,

    #[serde(
        rename = "p",
        skip_serializing_if = "PruneFlag::is_not_set",
        default = "PruneFlag::default"
    )]
    prune_flag: PruneFlag,
}

impl Extensions {
    pub fn new(calendar_id: Option<Hash>, stream_meta: StreamMeta, prune_flag: PruneFlag) -> Self {
        Self {
            calendar_id: calendar_id.map(|hash| CalendarId(hash)),
            stream_meta,
            prune_flag,
        }
    }
}

impl Extension<LogId> for Extensions {
    fn extract(&self) -> Option<LogId> {
        Some(self.stream_meta.log_id())
    }
}

impl Extension<CalendarId> for Extensions {
    fn extract(&self) -> Option<CalendarId> {
        self.calendar_id.clone()
    }
}

impl Extension<StreamMeta> for Extensions {
    fn extract(&self) -> Option<StreamMeta> {
        Some(self.stream_meta.clone())
    }
}

impl Extension<PruneFlag> for Extensions {
    fn extract(&self) -> Option<PruneFlag> {
        Some(self.prune_flag.clone())
    }
}

pub async fn create_operation(
    store: &mut MemoryStore<LogId, Extensions>,
    private_key: &PrivateKey,
    extensions: Extensions,
    body: Option<&[u8]>,
) -> (Header<Extensions>, Option<Body>) {
    let body = body.map(Body::new);
    let public_key = private_key.public_key();

    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .expect("time from operation system")
        .as_secs();

    let log_id = extensions
        .extract()
        .expect("log id is present on extensions");

    // @TODO(adz): Memory stores are infallible right now but we'll switch to a SQLite-based one
    // soon and then we need to handle this error here:
    let Ok(latest_operation) = store.latest_operation(&public_key, &log_id).await;

    let (seq_num, backlink) = match latest_operation {
        Some((header, _)) => (header.seq_num + 1, Some(header.hash())),
        None => (0, None),
    };

    let mut header = Header {
        version: 1,
        public_key,
        signature: None,
        payload_size: body.as_ref().map_or(0, |body| body.size()),
        payload_hash: body.as_ref().map(|body| body.hash()),
        timestamp,
        seq_num,
        backlink,
        previous: vec![],
        extensions: Some(extensions),
    };
    header.sign(private_key);

    (header, body)
}

pub fn encode_gossip_message(
    header: &Header<Extensions>,
    body: Option<&Body>,
) -> Result<Vec<u8>, EncodeError> {
    let bytes = encode_cbor(&(header.to_bytes(), body.map(|body| body.to_bytes())))?;
    Ok(bytes)
}

pub fn decode_gossip_message(bytes: &[u8]) -> Result<(Vec<u8>, Option<Vec<u8>>), DecodeError> {
    let raw_operation = decode_cbor(bytes)?;
    Ok(raw_operation)
}
