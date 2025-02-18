use std::fmt::Display;
use std::hash::Hash as StdHash;

use p2panda_core::cbor::encode_cbor;
use p2panda_core::{Extension, Hash, Header, PruneFlag, PublicKey};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct CalendarId(Hash);

impl From<Hash> for CalendarId {
    fn from(hash: Hash) -> Self {
        CalendarId(hash)
    }
}

impl Display for CalendarId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct StreamName {
    pub owner: PublicKey,
    pub name: String,
}

impl StreamName {
    pub fn hash(&self) -> Hash {
        let bytes = encode_cbor(&self).unwrap();
        Hash::new(&bytes)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct LogId {
    pub calendar_id: CalendarId,
    pub stream_name: StreamName,
}

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct Extensions {
    #[serde(rename = "c")]
    pub calendar_id: Option<CalendarId>,

    #[serde(rename = "s")]
    pub stream_name: Option<StreamName>,

    #[serde(
        rename = "p",
        skip_serializing_if = "PruneFlag::is_not_set",
        default = "PruneFlag::default"
    )]
    pub prune_flag: PruneFlag,
}

impl Extension<StreamName> for Extensions {
    fn extract(header: &Header<Self>) -> Option<StreamName> {
        let Some(ref extensions) = header.extensions else {
            return None;
        };

        match extensions.stream_name.as_ref() {
            Some(stream_name) => Some(stream_name.clone()),
            None => Some(StreamName {
                owner: header.public_key,
                name: header.hash().to_hex(),
            }),
        }
    }
}

impl Extension<CalendarId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<CalendarId> {
        let Some(ref extensions) = header.extensions else {
            return None;
        };

        let stream_name: StreamName = header.extension().expect("extract stream name");

        match extensions.calendar_id.clone() {
            Some(calendar_id) => Some(calendar_id),
            None => Some(stream_name.hash().into()),
        }
    }
}

impl Extension<LogId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<LogId> {
        let calendar_id: CalendarId = header.extension().expect("extract calendar id");
        let stream_name: StreamName = header.extension().expect("extract stream name");

        Some(LogId {
            calendar_id,
            stream_name,
        })
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
