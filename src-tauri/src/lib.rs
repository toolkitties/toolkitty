mod app;
mod blobs;
mod messages;
mod node;
mod rpc;
mod topic;

use tauri::Builder;

use crate::rpc::{
    ack, add_topic_log, init, public_key, publish, publish_ephemeral, replay, subscribe,
    subscribe_ephemeral, upload_file,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let logger = tauri_plugin_log::Builder::new()
        .filter(|metadata| metadata.target().starts_with("toolkitty_lib"))
        .build();

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
        .register_asynchronous_uri_scheme_protocol("blobstore", blobs::blobstore_protocol)
        .plugin(logger)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            init,
            ack,
            public_key,
            add_topic_log,
            publish,
            publish_ephemeral,
            replay,
            subscribe,
            subscribe_ephemeral,
            upload_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
