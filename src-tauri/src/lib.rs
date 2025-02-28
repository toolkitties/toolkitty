mod app;
mod messages;
mod node;
mod rpc;
mod topic;

use tauri::Builder;

use crate::rpc::{
    ack, add_topic_log, init, public_key, publish, publish_ephemeral, replay, subscribe,
    subscribe_ephemeral,
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
            return Ok(());
        });
    };

    builder
        .plugin(logger)
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            init,
            ack,
            public_key,
            add_topic_log,
            publish,
            publish_ephemeral,
            replay,
            subscribe,
            subscribe_ephemeral
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
