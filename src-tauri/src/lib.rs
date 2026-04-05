mod pty;
mod state;
mod vault;

use state::AppState;

/// log desde el frontend al stdout del proceso rust
#[tauri::command]
fn frontend_log(level: String, message: String) {
    eprintln!("[webview:{level}] {message}");
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            frontend_log,
            pty::commands::create_pty,
            pty::commands::write_pty,
            pty::commands::resize_pty,
            pty::commands::close_pty,
            vault::commands::list_vaults,
            vault::commands::create_vault,
            vault::commands::open_vault,
            vault::commands::save_canvas,
            vault::commands::load_canvas,
            vault::commands::list_canvases,
            vault::commands::get_default_vault_path,
            vault::commands::save_settings,
            vault::commands::load_settings,
        ])
        .setup(|_app| {
            // devtools disponibles via Ctrl+Shift+I manualmente
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running scrapbook");
}
