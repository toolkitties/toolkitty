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
        let message_type = match self {
            MessageType::Calendar => "calendar",
            MessageType::Event => "event",
            MessageType::Resource => "resource",
        };
        write!(f, "{message_type}")
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

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogId {
    // @TODO(adz): Currently we store everything in one log per calendar, later we want to list all
    // possible "log types" here, for example for all events, resources, messages etc.
    pub calendar_id: CalendarId,
}

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
    fn extract(header: &Header<Self>) -> Option<LogId> {
        Extension::<CalendarId>::extract(header).map(|calendar_id| LogId { calendar_id })
    }
}

impl Extension<CalendarId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<CalendarId> {
        let calendar_id: Option<CalendarId> = match &header.extensions {
            Some(extensions) => extensions.calendar_id,
            None => None,
        };

        // @TODO: Make sure we can only derive calendar id's for application events who create an
        // calendar.
        match calendar_id {
            Some(id) => Some(id),
            // If no calendar id is given we derive it from the header itself of the operation
            // which creates the festival.
            None => Some(header.hash().into()),
        }
    }
}

impl Extension<PruneFlag> for Extensions {
    fn extract(header: &Header<Self>) -> Option<PruneFlag> {
        header
            .extensions
            .as_ref()
            .map(|extensions| extensions.prune_flag.clone())
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

    let latest_operation = match extensions.calendar_id {
        Some(calendar_id) => {
            let log_id = LogId { calendar_id };

            // @TODO(adz): Memory stores are infallible right now but we'll switch to a SQLite-based one
            // soon and then we need to handle this error here:
            let Ok(latest_operation) = store.latest_operation(&public_key, &log_id).await;
            latest_operation
        }
        // If no log id was present on the extensions we can assume this is the first operation in
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
