use std::hash::Hash as StdHash;
use std::time::SystemTime;

use p2panda_core::{Body, Extension, Header, PrivateKey, PruneFlag};
use p2panda_store::{LocalLogStore, MemoryStore};
use serde::{Deserialize, Serialize};

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
        // @TODO
        todo!()
    }
}

impl Extension<PruneFlag> for Extensions {
    fn extract(&self) -> Option<PruneFlag> {
        Some(self.prune_flag.clone())
    }
}

pub async fn create_operation(
    store: &mut MemoryStore<LogId, Extensions>,
    log_id: &LogId,
    private_key: &PrivateKey,
    body: Option<&[u8]>,
    prune_flag: bool,
) -> (Header<Extensions>, Option<Body>) {
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

    (header, body)
}
