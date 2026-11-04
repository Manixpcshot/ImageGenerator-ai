use serde_json::{json, Value};
use std::{io::{BufRead, BufReader}, path::PathBuf, process::{Command, Stdio}};
use tauri::{Emitter, Manager};

fn worker_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let bundled = app.path().resource_dir().map_err(|e| e.to_string())?.join("worker.py");
    if bundled.exists() { return Ok(bundled); }
    Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts/worker.py"))
}
#[tauri::command]
async fn run_worker(app: tauri::AppHandle, action: String, args: Value) -> Result<(), String> {
    if !["hardware", "download", "generate"].contains(&action.as_str()) { return Err("Invalid action".into()); }
    let script = worker_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        let python = std::env::var("DREAMCANVAS_PYTHON").unwrap_or_else(|_| if cfg!(windows) { "python".into() } else { "python3".into() });
        let mut child = Command::new(python).arg(script).arg(action).arg(args.to_string()).stdout(Stdio::piped()).stderr(Stdio::null()).spawn().map_err(|e| format!("Could not start Python: {e}. Install Python and the dependencies described in README."))?;
        let stdout = child.stdout.take().ok_or("Could not read worker output")?;
        for line in BufReader::new(stdout).lines() {
            if let Ok(line) = line { if let Ok(event) = serde_json::from_str::<Value>(&line) { let _ = app.emit("worker-event", event); } }
        }
        let status = child.wait().map_err(|e| e.to_string())?;
        if !status.success() { return Err("Worker failed. Check that Python dependencies and the selected model are installed.".into()); }
        Ok(())
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
fn default_paths(app: tauri::AppHandle) -> Result<Value, String> {
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let pictures = app.path().picture_dir().unwrap_or_else(|_| data.clone());
    Ok(json!({"models": data.join("models").to_string_lossy(), "output": pictures.join("DreamCanvas").to_string_lossy()}))
}
#[tauri::command]
fn list_images(path: String) -> Vec<String> {
    let mut files: Vec<_> = std::fs::read_dir(path).into_iter().flatten().flatten().map(|e| e.path()).filter(|p| p.extension().map(|x| x.eq_ignore_ascii_case("png")).unwrap_or(false)).collect();
    files.sort_by(|a,b| b.cmp(a));
    files.into_iter().take(200).map(|p| p.to_string_lossy().to_string()).collect()
}
#[tauri::command]
fn image_data(path: String, output: String) -> Result<Vec<u8>, String> {
    let file = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
    let dir = std::fs::canonicalize(output).map_err(|e| e.to_string())?;
    if !file.starts_with(dir) || file.extension().and_then(|x| x.to_str()) != Some("png") { return Err("Invalid image path".into()); }
    std::fs::read(file).map_err(|e| e.to_string())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() { tauri::Builder::default().plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init()).invoke_handler(tauri::generate_handler![run_worker, default_paths, list_images, image_data]).run(tauri::generate_context!()).expect("error running DreamCanvas"); }
