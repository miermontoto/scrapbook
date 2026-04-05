use crate::state::AppState;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::ipc::Channel;

use super::instance::PtyInstance;

#[tauri::command]
pub fn create_pty(
    state: tauri::State<'_, AppState>,
    on_output: Channel<Vec<u8>>,
    shell: Option<String>,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let pty_system = NativePtySystem::default();

    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system.openpty(size).map_err(|e| e.to_string())?;

    let shell_path = shell.unwrap_or_else(|| {
        // leer shell del usuario desde /etc/passwd (mas fiable que $SHELL)
        get_user_shell()
    });

    let mut cmd = CommandBuilder::new(&shell_path);
    // arrancar como login shell (compatible con bash, zsh, fish, etc.)
    cmd.env("TERM", "xterm-256color");

    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    // ya no necesitamos el slave
    drop(pair.slave);

    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let alive = Arc::new(AtomicBool::new(true));
    let alive_clone = alive.clone();

    // hilo dedicado para lectura bloqueante del PTY
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            if !alive_clone.load(Ordering::Relaxed) {
                break;
            }
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let _ = on_output.send(buf[..n].to_vec());
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }
    });

    let instance = PtyInstance::new(id.clone(), pair.master, writer, child, alive, cols, rows);
    state.ptys.lock().insert(id.clone(), instance);

    Ok(id)
}

#[tauri::command]
pub fn write_pty(
    state: tauri::State<'_, AppState>,
    pty_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let mut ptys = state.ptys.lock();
    let instance = ptys.get_mut(&pty_id).ok_or("PTY not found")?;
    instance.write_data(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resize_pty(
    state: tauri::State<'_, AppState>,
    pty_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let ptys = state.ptys.lock();
    let instance = ptys.get(&pty_id).ok_or("PTY not found")?;
    instance.resize(cols, rows).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn close_pty(
    state: tauri::State<'_, AppState>,
    pty_id: String,
) -> Result<(), String> {
    let mut ptys = state.ptys.lock();
    // drop llama a PtyInstance::kill()
    ptys.remove(&pty_id).ok_or("PTY not found")?;
    Ok(())
}

/// obtener shell del usuario desde /etc/passwd en lugar de $SHELL,
/// que puede no reflejar el shell real (ej: cuando se lanza desde otro shell)
fn get_user_shell() -> String {
    // intentar leer de /etc/passwd
    if let Ok(contents) = std::fs::read_to_string("/etc/passwd") {
        if let Ok(user) = std::env::var("USER") {
            for line in contents.lines() {
                if line.starts_with(&format!("{user}:")) {
                    if let Some(shell) = line.rsplit(':').next() {
                        if !shell.is_empty() {
                            return shell.to_string();
                        }
                    }
                }
            }
        }
    }
    // fallback a $SHELL, luego /bin/sh
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
}
