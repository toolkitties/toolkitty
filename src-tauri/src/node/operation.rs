use std::fmt::Display;
use std::hash::Hash as StdHash;
use std::time::SystemTime;

use p2panda_core::cbor::{decode_cbor, encode_cbor, DecodeError, EncodeError};
use p2panda_core::{Body, Extension, Hash, Header, PrivateKey, PruneFlag};
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

#[derive(Clone, Copy, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarId(pub Hash);

impl Display for CalendarId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<Hash> for CalendarId {
    fn from(value: Hash) -> Self {
        CalendarId(value)
    }
}

impl From<CalendarId> for Hash {
    fn from(id: CalendarId) -> Self {
        id.0
    }
}

impl From<CalendarId> for LogId {
    fn from(id: CalendarId) -> Self {
        LogId(id.0)
    }
}

impl From<Hash> for LogId {
    fn from(value: Hash) -> Self {
        LogId(value)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogId(Hash);

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct Extensions {
    #[serde(rename = "c")]
    pub calendar_id: Option<CalendarId>,

    #[serde(
        rename = "p",
        skip_serializing_if = "PruneFlag::is_not_set",
        default = "PruneFlag::default"
    )]
    pub prune_flag: PruneFlag,
}

impl Extension<LogId> for Extensions {
    fn with_header(header: &Header<Self>) -> Option<LogId> {
        Extension::<CalendarId>::with_header(header).map(Into::into)
    }

    fn extract(&self) -> Option<LogId> {
        Extension::<CalendarId>::extract(self).map(Into::into)
    }
}

impl Extension<CalendarId> for Extensions {
    fn with_header(header: &Header<Self>) -> Option<CalendarId> {
        let calendar_id: Option<CalendarId> = match &header.extensions {
            Some(extensions) => extensions.extract(),
            None => None,
        };

        match calendar_id {
            Some(id) => Some(id),
            None => Some(header.hash().into()),
        }
    }

    fn extract(&self) -> Option<CalendarId> {
        self.calendar_id
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

    let latest_operation = match extensions.extract() {
        Some(log_id) => {
            // @TODO(adz): Memory stores are infallible right now but we'll switch to a SQLite-based one
            // soon and then we need to handle this error here:
            let Ok(latest_operation) = store.latest_operation(&public_key, &log_id).await;
            latest_operation
        }
        // If no LogId was present on the extensions we can assume this is the first operation in
        // a new log.
        None => None,
    };

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
