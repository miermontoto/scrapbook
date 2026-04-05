use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub last_opened: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultRegistry {
    pub vaults: Vec<VaultEntry>,
    pub last_active_vault: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasEntry {
    pub id: String,
    pub name: String,
}

fn registry_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("~/.config"))
        .join("scrapbook");
    fs::create_dir_all(&config_dir).ok();
    config_dir.join("vaults.json")
}

fn read_registry() -> VaultRegistry {
    let path = registry_path();
    if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or(VaultRegistry {
            vaults: vec![],
            last_active_vault: None,
        })
    } else {
        VaultRegistry {
            vaults: vec![],
            last_active_vault: None,
        }
    }
}

fn write_registry(registry: &VaultRegistry) -> Result<(), String> {
    let path = registry_path();
    let content = serde_json::to_string_pretty(registry).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_vaults() -> Result<Vec<VaultEntry>, String> {
    Ok(read_registry().vaults)
}

#[tauri::command]
pub fn create_vault(path: String, name: String) -> Result<VaultEntry, String> {
    let vault_dir = PathBuf::from(&path);
    let scrapbook_dir = vault_dir.join(".scrapbook");
    let canvases_dir = scrapbook_dir.join("canvases");

    fs::create_dir_all(&canvases_dir).map_err(|e| e.to_string())?;

    // configuracion por defecto del vault
    let config = serde_json::json!({
        "name": name,
        "createdAt": chrono_now()
    });
    fs::write(
        scrapbook_dir.join("config.json"),
        serde_json::to_string_pretty(&config).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    // canvas por defecto
    let default_canvas = serde_json::json!({
        "version": 1,
        "id": "default",
        "name": "Default",
        "createdAt": chrono_now(),
        "modifiedAt": chrono_now(),
        "viewport": { "x": 0, "y": 0, "zoom": 1.0 },
        "nodes": []
    });
    fs::write(
        canvases_dir.join("default.json"),
        serde_json::to_string_pretty(&default_canvas).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    let entry = VaultEntry {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        path,
        last_opened: chrono_now(),
    };

    let mut registry = read_registry();
    registry.last_active_vault = Some(entry.id.clone());
    registry.vaults.push(entry.clone());
    write_registry(&registry)?;

    Ok(entry)
}

#[tauri::command]
pub fn open_vault(path: String) -> Result<serde_json::Value, String> {
    let config_path = PathBuf::from(&path).join(".scrapbook/config.json");
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // actualizar last_opened en el registro
    let mut registry = read_registry();
    if let Some(entry) = registry.vaults.iter_mut().find(|v| v.path == path) {
        entry.last_opened = chrono_now();
        registry.last_active_vault = Some(entry.id.clone());
    }
    write_registry(&registry)?;

    Ok(config)
}

#[tauri::command]
pub fn save_canvas(vault_path: String, canvas_id: String, data: String) -> Result<(), String> {
    let canvas_path = PathBuf::from(&vault_path)
        .join(".scrapbook/canvases")
        .join(format!("{}.json", canvas_id));

    // escritura atomica: tmp + rename
    let tmp_path = canvas_path.with_extension("json.tmp");
    fs::write(&tmp_path, &data).map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, &canvas_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_canvas(vault_path: String, canvas_id: String) -> Result<String, String> {
    let canvas_path = PathBuf::from(&vault_path)
        .join(".scrapbook/canvases")
        .join(format!("{}.json", canvas_id));
    fs::read_to_string(&canvas_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_canvases(vault_path: String) -> Result<Vec<CanvasEntry>, String> {
    let canvases_dir = PathBuf::from(&vault_path).join(".scrapbook/canvases");
    let mut entries = Vec::new();

    if canvases_dir.exists() {
        for entry in fs::read_dir(&canvases_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "json") {
                let id = path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let content = fs::read_to_string(&path).unwrap_or_default();
                let name = serde_json::from_str::<serde_json::Value>(&content)
                    .ok()
                    .and_then(|v| v["name"].as_str().map(String::from))
                    .unwrap_or_else(|| id.clone());
                entries.push(CanvasEntry { id, name });
            }
        }
    }

    Ok(entries)
}

#[tauri::command]
pub fn save_settings(vault_path: String, settings: String) -> Result<(), String> {
    let config_path = PathBuf::from(&vault_path).join(".scrapbook/config.json");
    let content = fs::read_to_string(&config_path).unwrap_or_else(|_| "{}".to_string());
    let mut config: serde_json::Value = serde_json::from_str(&content).unwrap_or(serde_json::json!({}));

    let settings_val: serde_json::Value = serde_json::from_str(&settings).map_err(|e| e.to_string())?;
    config["settings"] = settings_val;

    let tmp_path = config_path.with_extension("json.tmp");
    fs::write(&tmp_path, serde_json::to_string_pretty(&config).unwrap()).map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, &config_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_settings(vault_path: String) -> Result<String, String> {
    let config_path = PathBuf::from(&vault_path).join(".scrapbook/config.json");
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    match config.get("settings") {
        Some(s) => Ok(s.to_string()),
        None => Ok("{}".to_string()),
    }
}

#[tauri::command]
pub fn get_default_vault_path() -> Result<String, String> {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("~/.config"))
        .join("scrapbook")
        .join("default");
    Ok(config_dir.to_string_lossy().to_string())
}

fn chrono_now() -> String {
    // formato ISO 8601 basico sin dependencia de chrono
    let dur = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();
    // suficiente para timestamps de archivos
    format!("{}Z", secs)
}
