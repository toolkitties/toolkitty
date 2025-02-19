use std::fmt::Display;
use std::hash::Hash as StdHash;

use p2panda_core::cbor::encode_cbor;
use p2panda_core::{Extension, Hash, Header, PruneFlag, PublicKey};
use serde::{Deserialize, Serialize};
use serde_json::Value;

// #[derive(Clone, Copy, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
// pub struct CalendarId(Hash);
// 
// impl From<Hash> for CalendarId {
//     fn from(hash: Hash) -> Self {
//         CalendarId(hash)
//     }
// }
// 
// impl Display for CalendarId {
//     fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
//         write!(f, "{}", self.0)
//     }
// }

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct StreamName(pub(crate) Value);

impl StreamName {
    pub fn hash(&self) -> Hash {
        let bytes = encode_cbor(&self).unwrap();
        Hash::new(&bytes)
    }
}

impl From<Value> for StreamName {
    fn from(value: Value) -> Self {
        Self(value)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct LogId {
    pub stream_name: StreamName,
}

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct Extensions {
    // #[serde(rename = "c")]
    // pub calendar_id: Option<CalendarId>,

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

        extensions.stream_name.clone()
    }
}
// 
// impl Extension<CalendarId> for Extensions {
//     fn extract(header: &Header<Self>) -> Option<CalendarId> {
//         let Some(ref extensions) = header.extensions else {
//             return None;
//         };
// 
//         match extensions.calendar_id.clone() {
//             Some(calendar_id) => Some(calendar_id),
//             None => Some(header.hash().into()),
//         }
//     }
// }

impl Extension<LogId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<LogId> {
        let stream_name: StreamName = header.extension().expect("extract stream name");

        Some(LogId { stream_name })
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
