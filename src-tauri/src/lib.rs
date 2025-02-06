mod api;
mod app;
mod messages;
mod node;
mod topic;

use tauri::Builder;

use crate::api::{
    ack, create_calendar, init, publish_calendar_event, publish_to_invite_code_overlay,
    select_calendar, subscribe_to_calendar,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();
            app::Service::run(app_handle);
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            init,
            ack,
            create_calendar,
            publish_calendar_event,
            publish_to_invite_code_overlay,
            select_calendar,
            subscribe_to_calendar,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
