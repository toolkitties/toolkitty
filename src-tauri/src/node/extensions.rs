use std::fmt::Display;
use std::hash::Hash as StdHash;

use anyhow::anyhow;
use p2panda_core::{Extension, Hash, Header, PruneFlag, PublicKey};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Identifier for a collection of logs.
///
/// StreamId is a universally unique identifier which associates many logs, from one or many authors, into one
/// collection. The semantic meaning of the collection is defined on the application level, it
/// might be a single chat group containing many threads, or a blog page with posts from many contributors.
///
/// Crucially, the included logs can be from one or many authors, but the stream itself is "owned"
/// by the public key in the `owner` field. This ownership relationship is required when defining
/// access-control rules on top of streams. The `root_hash` is derived from the "first" operation
/// published to this stream, we don't mind that proof that this is actually the case may be lost through
/// pruning, as it's primary function is to act as a nonce which introduces uniqueness to this
/// stream id.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamId {
    pub(crate) root_hash: StreamRootHash,
    pub(crate) owner: StreamOwner,
}

impl TryFrom<Extensions> for StreamId {
    type Error = anyhow::Error;

    fn try_from(extensions: Extensions) -> Result<Self, Self::Error> {
        let Some(root_hash) = extensions.stream_root_hash else {
            return Err(anyhow!("stream root_hash missing"));
        };
        let Some(owner) = extensions.stream_owner else {
            return Err(anyhow!("stream owner missing"));
        };

        Ok(Self { root_hash, owner })
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct StreamRootHash(Hash);

impl From<Hash> for StreamRootHash {
    fn from(hash: Hash) -> Self {
        StreamRootHash(hash)
    }
}

impl Display for StreamRootHash {
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

/// Identifier for a log.
///
/// A log id is used to identify which log an operation is to be appended to. It is used in
/// operation construction to know the current log height as well as for validation of other
/// header values when receiving operations from the network.
///
/// Logs are single-writer, with the author being encoded on the operation header. For this reason
/// log ids only need to be unique per-author.
///
/// A log id is constructed from a stream id id and a log path. The stream id ensures that no
/// naming collision can occur _between_ logs in different streams, and the log path allows the
/// application layer itself to design how logs are layed out within a stream.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct LogId {
    pub(crate) stream_id: StreamId,
    pub(crate) log_path: Option<LogPath>,
}

/// The log path is any arbitrary value defined by the application layer. It's the application
/// layers concern to ensure that no namespace collision occurs _within_ a stream.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct LogPath(pub(crate) Value);

impl From<Value> for LogPath {
    fn from(value: Value) -> Self {
        Self(value)
    }
}

impl TryFrom<Extensions> for LogId {
    type Error = anyhow::Error;

    fn try_from(extensions: Extensions) -> Result<Self, Self::Error> {
        let stream_id = StreamId::try_from(extensions.clone())?;
        let log_path = extensions.log_path.clone();

        Ok(Self {
            stream_id,
            log_path,
        })
    }
}

impl Display for LogPath {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct Extensions {
    #[serde(rename = "r")]
    pub stream_root_hash: Option<StreamRootHash>,

    #[serde(rename = "o")]
    pub stream_owner: Option<StreamOwner>,

    #[serde(rename = "l")]
    pub log_path: Option<LogPath>,

    #[serde(
        rename = "p",
        skip_serializing_if = "PruneFlag::is_not_set",
        default = "PruneFlag::default"
    )]
    pub prune_flag: PruneFlag,
}

impl Extension<StreamRootHash> for Extensions {
    fn extract(header: &Header<Self>) -> Option<StreamRootHash> {
        let Some(ref extensions) = header.extensions else {
            return None;
        };

        match extensions.stream_root_hash.clone() {
            Some(stream_root_hash) => Some(stream_root_hash),
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

impl Extension<StreamId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<StreamId> {
        let root_hash = header.extension().expect("extract root hash extension");
        let owner = header.extension().expect("extract owner extension");
        Some(StreamId { root_hash, owner })
    }
}

impl Extension<LogPath> for Extensions {
    fn extract(header: &Header<Self>) -> Option<LogPath> {
        let Some(ref extensions) = header.extensions else {
            return None;
        };

        extensions.log_path.clone()
    }
}

impl Extension<LogId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<LogId> {
        let stream_id = header.extension().expect("extract stream id extension");
        let log_path = header.extension();
        Some(LogId {
            stream_id,
            log_path,
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
