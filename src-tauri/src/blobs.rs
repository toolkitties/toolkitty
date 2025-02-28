use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{bail, Result};
use iroh_io::AsyncSliceReaderExt;
use p2panda_core::Hash;
use tauri::http::{header, Request, Response, StatusCode, Uri};
use tauri::{Manager, Runtime, UriSchemeContext, UriSchemeResponder};
use tokio::sync::RwLock;
use tokio::task::LocalSet;
use tokio::time::timeout;

use crate::app::{Context, Rpc};

/// blobstore://<hash>
pub const BLOBSTORE_URI_SCHEME: &str = "blobstore";

/// Timelimit for finding another peer and downloading the blob from them before returning a "Not
/// Found" (404) error.
const SYNC_TIMEOUT: Duration = Duration::from_secs(5);

/// Handler for the custom `blobstore://` URI scheme protocol which will be registered in the Tauri
/// WebView.
///
/// This allows the frontend to request a file addressed with it's hash. First we check if the file
/// exists in our local blob store, if not, we'll request to download the file from other peers.
/// This might take a while as no peer with that file might be online, we will receive a timeout
/// after a while which is interpreted as a "Not Found" 404 failure.
///
/// To make this work in Tauri we need to allow this protocol in the CSP config, for example via:
///
/// ```json
/// "csp": {
///   "img-src": "'self' data: blobstore:"
/// }
/// ```
pub fn blobstore_protocol<R: Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let context = { ctx.app_handle().state::<Rpc>().context.clone() };

    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();

    std::thread::spawn(move || {
        let local = LocalSet::new();

        local.spawn_local(async move {
            let response = match parse_blob_hash(request.uri()) {
                Ok(blob_hash) => handle_request(context, blob_hash, true).await,
                Err(err) => error(StatusCode::BAD_REQUEST, err.to_string()),
            };

            let response = response.unwrap_or_else(|err| {
                error(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).unwrap()
            });

            responder.respond(response);
        });

        // This will return once all senders are dropped and all
        // spawned tasks have returned.
        rt.block_on(local);
    });
}

/// Extracts the blob's hash from the request URI. The hash is encoded as a 64 hexadecimal
/// character string.
///
/// blobstore://<hash>/
///               |
///           URI "host"
fn parse_blob_hash(uri: &Uri) -> Result<Hash> {
    if uri.scheme_str() != Some(BLOBSTORE_URI_SCHEME) {
        bail!("uri scheme is not blobstore");
    };

    let Some(hash_str) = uri.host() else {
        bail!("blob hash missing");
    };

    let Ok(hash) = Hash::from_str(hash_str) else {
        bail!("invalid hexadecimal blob hash string");
    };

    if let Some(path) = uri.path_and_query() {
        if path.to_string() != "/" {
            bail!("suspicious suffix after blob hash");
        }
    }

    Ok(hash)
}

async fn handle_request(
    context: Arc<RwLock<Context>>,
    blob_hash: Hash,
    first_attempt: bool,
) -> ResponseResult {
    let context_read = context.read().await;
    let result = context_read.node.read_file(blob_hash).await;
    match result {
        // We have the blob locally on our machine, forward it to the frontend.
        Ok(Some(mut file)) => match file.read_to_end().await {
            Ok(file_bytes) => Response::builder()
                .status(StatusCode::OK)
                .body(file_bytes.to_vec()),
            Err(err) => error(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
        },
        // We don't have the blob, try to sync it from another peer first.
        Ok(None) => {
            if first_attempt {
                drop(context_read);
                try_lazy_sync(context, blob_hash).await
            } else {
                error(StatusCode::NOT_FOUND, StatusCode::NOT_FOUND.to_string())
            }
        }
        Err(err) => error(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

async fn try_lazy_sync(context: Arc<RwLock<Context>>, blob_hash: Hash) -> ResponseResult {
    let context_read = context.read().await;
    let result = timeout(SYNC_TIMEOUT, context_read.node.sync_remote_file(blob_hash)).await;
    match result {
        // Sync succeeded, we have the file! Continue handling request and respond with our now
        // local version of the blob.
        Ok(Ok(_)) => {
            drop(context_read);
            Box::pin(handle_request(context, blob_hash, false)).await
        }
        // Sync thrown an exception.
        Ok(Err(err)) => error(StatusCode::NOT_FOUND, err.to_string()),
        // Timeout has passed threshold.
        Err(elapsed) => error(
            StatusCode::NOT_FOUND,
            format!(
                "could not find a peer to sync blob within time limit: {}",
                elapsed
            ),
        ),
    }
}

fn error(status_code: StatusCode, message: String) -> ResponseResult {
    Response::builder()
        .status(status_code)
        .header(header::CONTENT_TYPE, mime::TEXT_PLAIN.essence_str())
        .body(message.as_bytes().to_vec())
}

type ResponseResult = Result<Response<Vec<u8>>, tauri::http::Error>;

#[cfg(test)]
mod tests {
    use tauri::http::Uri;

    use super::parse_blob_hash;

    #[test]
    fn parse_blobstore_uri() {
        assert!(parse_blob_hash(&Uri::from_static(
            "blobstore://3a9ff2cbee2fe12c1c9bd42f9ec18b34fffe42be6d34f4c670fb39cac373d278"
        ))
        .is_ok());

        // Trailing slash is ok.
        assert!(parse_blob_hash(&Uri::from_static(
            "blobstore://3a9ff2cbee2fe12c1c9bd42f9ec18b34fffe42be6d34f4c670fb39cac373d278/"
        ))
        .is_ok());

        // Invalid schema.
        assert!(parse_blob_hash(&Uri::from_static(
            "unknown://3a9ff2cbee2fe12c1c9bd42f9ec18b34fffe42be6d34f4c670fb39cac373d278"
        ))
        .is_err());

        // Invalid hexadecimal characters.
        assert!(parse_blob_hash(&Uri::from_static("blobstore://invalidhash")).is_err());

        // Too long hash.
        assert!(parse_blob_hash(&Uri::from_static(
            "blobstore://3a9ff2cbee2fe12c1c9bd42f9ec18b34fffe42be6d34f4c670fb39cac373d2781256"
        ))
        .is_err());

        // Invalid suffix.
        assert!(parse_blob_hash(&Uri::from_static(
            "blobstore://3a9ff2cbee2fe12c1c9bd42f9ec18b34fffe42be6d34f4c670fb39cac373d278/more/things?here"
        ))
        .is_err());
        assert!(parse_blob_hash(&Uri::from_static(
            "blobstore://3a9ff2cbee2fe12c1c9bd42f9ec18b34fffe42be6d34f4c670fb39cac373d278/?here"
        ))
        .is_err());
    }
}
