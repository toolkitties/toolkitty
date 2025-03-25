mod app;
mod blobs;
mod extensions;
mod messages;
mod rpc;

use tauri::Builder;
use tracing_subscriber::EnvFilter;

use crate::rpc::{
    ack, add_topic_log, init, public_key, publish_ephemeral, publish_persisted, replay,
    subscribe_ephemeral, subscribe_persisted, upload_file,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Setup logging.
    let writer = std::io::stderr;
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_line_number(true)
        .with_target(true)
        .with_writer(writer)
        .init();

    #[allow(unused_mut)]
    let mut builder = Builder::default();

    #[cfg(not(test))]
    {
        builder = builder.setup(|app| {
            let app_handle = app.handle().clone();
            app::Service::run(app_handle);
            Ok(())
        });
    };

    builder
        .register_asynchronous_uri_scheme_protocol(
            blobs::BLOBSTORE_URI_SCHEME,
            blobs::blobstore_protocol,
        )
        // .plugin(logger)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            init,
            ack,
            public_key,
            add_topic_log,
            publish_persisted,
            publish_ephemeral,
            replay,
            subscribe_persisted,
            subscribe_ephemeral,
            upload_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
