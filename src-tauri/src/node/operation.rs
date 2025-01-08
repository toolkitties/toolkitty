use std::hash::Hash as StdHash;
use std::time::SystemTime;

use anyhow::Result;
use p2panda_core::cbor::{decode_cbor, encode_cbor};
use p2panda_core::{Body, Extension, Header, PrivateKey, PruneFlag};
use p2panda_store::{LocalLogStore, MemoryStore};
use p2panda_stream::operation::ingest_operation;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Clone, Debug, Default, PartialEq, Eq, StdHash)]
pub enum LogId {
    // @TODO: `Default` requirement will be removed in future versions of p2panda-core.
    #[default]
    Calendar,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Extensions {
    #[serde(
        rename = "p",
        skip_serializing_if = "PruneFlag::is_not_set",
        default = "PruneFlag::default"
    )]
    prune_flag: PruneFlag,
}

impl Extension<LogId> for Extensions {
    fn extract(&self) -> Option<LogId> {
        // @TODO: replace this hard-coded log id with the correct logic.
        Some(LogId::Calendar)
    }
}

impl Extension<PruneFlag> for Extensions {
    fn extract(&self) -> Option<PruneFlag> {
        Some(self.prune_flag.clone())
    }
}

pub async fn publish_operation(
    store: &mut MemoryStore<LogId, Extensions>,
    log_id: &LogId,
    private_key: &PrivateKey,
    body: Option<&[u8]>,
    prune_flag: bool,
) -> Result<(Header<Extensions>, Option<Body>, Vec<u8>), PublishError> {
    let body = body.map(Body::new);
    let public_key = private_key.public_key();

    // @TODO(adz): Memory stores are infallible right now but we'll switch to a SQLite-based one
    // soon and then we need to handle this error here:
    let Ok(latest_operation) = store.latest_operation(&public_key, &log_id).await;

    let (seq_num, backlink) = match latest_operation {
        Some((header, _)) => (header.seq_num + 1, Some(header.hash())),
        None => (0, None),
    };

    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .expect("time from operation system")
        .as_secs();

    let extensions = Extensions {
        prune_flag: PruneFlag::new(prune_flag),
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

    let header_bytes = header.to_bytes();

    ingest_operation(
        store,
        header.clone(),
        body.clone(),
        header_bytes.clone(),
        &log_id,
        prune_flag,
    )
    .await?;

    Ok((header, body, header_bytes))
}

#[derive(Debug, Error)]
pub enum PublishError {
    #[error(transparent)]
    IngestError(#[from] p2panda_stream::operation::IngestError),
}

pub fn encode_gossip_operation(header: Header<Extensions>, body: Option<Body>) -> Result<Vec<u8>> {
    let bytes = encode_cbor(&(header.to_bytes(), body.map(|body| body.to_bytes())))?;
    Ok(bytes)
}

pub fn decode_gossip_message(bytes: &[u8]) -> Result<(Vec<u8>, Option<Vec<u8>>)> {
    let raw_operation = decode_cbor(bytes)?;
    Ok(raw_operation)
}
