use std::time::SystemTime;

use p2panda_core::cbor::{decode_cbor, encode_cbor, DecodeError, EncodeError};
use p2panda_core::{Body, Header, PrivateKey};
use p2panda_store::{LocalLogStore, MemoryStore};

use super::extensions::{Extensions, LogId};

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
        Some(ref calendar_id) => {
            let stream_name = extensions
                .stream_name
                .clone()
                .expect("stream name");

            let log_id = LogId {
                calendar_id: calendar_id.clone(),
                stream_name,
            };

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
