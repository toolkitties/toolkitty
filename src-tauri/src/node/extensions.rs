use std::fmt::Display;
use std::hash::Hash as StdHash;

use anyhow::anyhow;
use p2panda_core::{Extension, Hash, Header, PruneFlag, PublicKey};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stream {
    pub(crate) id: StreamId,
    pub(crate) owner: StreamOwner,
    pub(crate) name: StreamName,
}

impl From<Header<Extensions>> for Stream {
    fn from(header: Header<Extensions>) -> Self {
        let id = header.extension().expect("extract stream id extension");
        let owner = header.extension().expect("extract stream owner extension");
        let name = header.extension().expect("extract stream name extension");

        Self { id, owner, name }
    }
}

impl TryFrom<Extensions> for Stream {
    type Error = anyhow::Error;

    fn try_from(extensions: Extensions) -> Result<Self, Self::Error> {
        let Some(id) = extensions.stream_id else {
            return Err(anyhow!("stream id missing"));
        };
        let Some(name) = extensions.stream_name else {
            return Err(anyhow!("stream name missing"));
        };
        let Some(owner) = extensions.stream_owner else {
            return Err(anyhow!("stream owner missing"));
        };

        Ok(Self { id, owner, name })
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct StreamId(Hash);

impl From<Hash> for StreamId {
    fn from(hash: Hash) -> Self {
        StreamId(hash)
    }
}

impl Display for StreamId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct StreamOwner(PublicKey);

impl From<PublicKey> for StreamOwner {
    fn from(public_key: PublicKey) -> Self {
        StreamOwner(public_key)
    }
}

impl Display for StreamOwner {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

// @TODO(sam): There's no reason to specify that StreamName needs to be a JSON value, it would be
// better if it was completely generic, or just bytes. For now I leave it like this though.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct StreamName(pub(crate) Value);

impl From<Value> for StreamName {
    fn from(value: Value) -> Self {
        Self(value)
    }
}

impl Display for StreamName {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct LogId(Stream);

impl From<Stream> for LogId {
    fn from(stream: Stream) -> Self {
        Self(stream)
    }
}

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct Extensions {
    #[serde(rename = "s")]
    pub stream_id: Option<StreamId>,

    #[serde(rename = "o")]
    pub stream_owner: Option<StreamOwner>,

    #[serde(rename = "n")]
    pub stream_name: Option<StreamName>,

    #[serde(
        rename = "p",
        skip_serializing_if = "PruneFlag::is_not_set",
        default = "PruneFlag::default"
    )]
    pub prune_flag: PruneFlag,
}

impl Extension<StreamId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<StreamId> {
        let Some(ref extensions) = header.extensions else {
            return None;
        };

        match extensions.stream_id.clone() {
            Some(stream_id) => Some(stream_id),
            None => Some(header.hash().into()),
        }
    }
}

impl Extension<StreamOwner> for Extensions {
    fn extract(header: &Header<Self>) -> Option<StreamOwner> {
        let Some(ref extensions) = header.extensions else {
            return None;
        };

        match extensions.stream_owner.clone() {
            Some(stream_owner) => Some(stream_owner),
            None => Some(header.public_key.into()),
        }
    }
}

impl Extension<StreamName> for Extensions {
    fn extract(header: &Header<Self>) -> Option<StreamName> {
        let Some(ref extensions) = header.extensions else {
            return None;
        };

        extensions.stream_name.clone()
    }
}

impl Extension<LogId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<LogId> {
        let stream = header.clone().into();
        Some(LogId(stream))
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
