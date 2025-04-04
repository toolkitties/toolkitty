use std::fmt::Display;
use std::hash::Hash as StdHash;

use anyhow::anyhow;
use p2panda_core::{Extension, Hash, Header, PruneFlag, PublicKey};
use p2panda_node::extensions::LogId;
use serde::{Deserialize, Serialize};

/// Globally unique stream identified derived from hashing over the bytes of a streams' `root_hash`
/// and `owner` fields.
type StreamId = Hash;

/// Conceptually a stream is a collection of logs, from one or many authors. The semantic meaning of the
/// collection is defined on the application level, it might be a single chat group containing many threads,
/// or a blog page with posts from many contributors.
///
/// Crucially, the included logs can be from one or many authors, but the stream itself is "owned"
/// by the public key in the `owner` field. This ownership relationship is required when defining
/// access-control rules on top of streams. The `root_hash` is derived from the "first" operation
/// published to this stream, we don't mind that proof that this is actually the case may be lost through
/// pruning, as it's primary function is to act as a nonce which introduces uniqueness to this
/// stream id.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stream {
    /// The hash of the first operation in the stream.
    pub(crate) root_hash: StreamRootHash,

    /// The public key of the stream owner.
    pub(crate) owner: StreamOwner,
}

impl Stream {
    pub fn id(&self) -> StreamId {
        let bytes = [*self.root_hash.0.as_bytes(), *self.owner.0.as_bytes()].concat();
        StreamId::new(&bytes)
    }
}

impl TryFrom<Extensions> for Stream {
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

/// The log path is any arbitrary value defined by the application layer. It's the application
/// layers concern to ensure that no namespace collision occurs _within_ a stream.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct LogPath(pub(crate) String);

impl From<String> for LogPath {
    fn from(value: String) -> Self {
        Self(value)
    }
}

impl TryFrom<Extensions> for LogId {
    type Error = anyhow::Error;

    fn try_from(extensions: Extensions) -> Result<Self, Self::Error> {
        let stream = Stream::try_from(extensions.clone())?;
        let log_path = extensions.log_path.clone();

        Ok(to_log_id(stream, log_path))
    }
}

pub fn to_log_id(stream: Stream, log_path: Option<LogPath>) -> LogId {
    LogId(format!(
        "{}/{}",
        stream.id(),
        log_path
            .map(|path| path.to_string())
            .unwrap_or("".to_string())
    ))
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
        let extensions = header.extensions.as_ref()?;

        match extensions.stream_root_hash {
            Some(stream_root_hash) => Some(stream_root_hash),
            None => Some(header.hash().into()),
        }
    }
}

impl Extension<StreamOwner> for Extensions {
    fn extract(header: &Header<Self>) -> Option<StreamOwner> {
        let extensions = header.extensions.as_ref()?;

        match extensions.stream_owner {
            Some(stream_owner) => Some(stream_owner),
            None => Some(header.public_key.into()),
        }
    }
}

impl Extension<Stream> for Extensions {
    fn extract(header: &Header<Self>) -> Option<Stream> {
        let root_hash = header.extension().expect("extract root hash extension");
        let owner = header.extension().expect("extract owner extension");
        Some(Stream { root_hash, owner })
    }
}

impl Extension<LogPath> for Extensions {
    fn extract(header: &Header<Self>) -> Option<LogPath> {
        let extensions = header.extensions.as_ref()?;

        extensions.log_path.clone()
    }
}

impl Extension<LogId> for Extensions {
    fn extract(header: &Header<Self>) -> Option<LogId> {
        let stream: Stream = header.extension().expect("extract stream id extension");
        let log_path: Option<LogPath> = header.extension();
        Some(to_log_id(stream, log_path))
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
