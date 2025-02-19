mod app;
mod messages;
mod node;
mod rpc;
mod topic;

use tauri::Builder;

use crate::rpc::{
    ack, add_calendar_author, create_calendar, init, public_key, publish,
    publish_to_invite_code_overlay, select_calendar, subscribe,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let logger = tauri_plugin_log::Builder::new()
        .filter(|metadata| metadata.target().starts_with("toolkitty_lib"))
        .build();

    Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();
            app::Service::run(app_handle);
            Ok(())
        })
        .plugin(logger)
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            init,
            ack,
            public_key,
            add_calendar_author,
            create_calendar,
            publish,
            publish_to_invite_code_overlay,
            select_calendar,
            subscribe,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
