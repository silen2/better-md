#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod workspace;

use workspace::{read_text_file, scan_workspace, search_workspace, startup_file};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_workspace,
            read_text_file,
            search_workspace,
            startup_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running BetterMD")
}
