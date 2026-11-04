use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{Emitter, Manager};

/// Locate the bundled worker script, falling back to the repository copy in dev.
fn worker_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(resources) = app.path().resource_dir() {
        let bundled = resources.join("worker.py");
        if bundled.exists() {
            return Ok(bundled);
        }
    }
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts/worker.py");
    if dev.exists() {
        return Ok(dev);
    }
    Err(format!(
        "worker.py was not found (looked next to the app and at {}). Reinstall DreamCanvas or run it from the repository.",
        dev.display()
    ))
}

fn tail(text: &str, limit: usize) -> String {
    let trimmed = text.trim();
    if trimmed.chars().count() <= limit {
        return trimmed.to_string();
    }
    trimmed.chars().skip(trimmed.chars().count() - limit).collect()
}

#[tauri::command]
async fn run_worker(app: tauri::AppHandle, action: String, args: Value) -> Result<(), String> {
    if !matches!(action.as_str(), "hardware" | "download" | "generate") {
        return Err("Invalid action".into());
    }
    let script = worker_path(&app)?;

    tauri::async_runtime::spawn_blocking(move || {
        let python = std::env::var("DREAMCANVAS_PYTHON")
            .unwrap_or_else(|_| if cfg!(windows) { "python".into() } else { "python3".into() });

        let mut command = Command::new(&python);
        command
            .arg(&script)
            .arg(&action)
            .arg(args.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Hide the worker console without changing its stdout event stream.
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let mut child = command.spawn().map_err(|error| {
            format!("Could not start Python ({python}): {error}. Install Python 3.10+ and run `python3 -m pip install -r scripts/requirements.txt`, or set DREAMCANVAS_PYTHON to the full path of your interpreter.")
        })?;

        // Drain stderr on a thread so a noisy library can never fill the pipe and
        // deadlock the worker, while keeping the last lines for error messages.
        let stderr_buffer = Arc::new(Mutex::new(String::new()));
        if let Some(mut stream) = child.stderr.take() {
            let buffer = Arc::clone(&stderr_buffer);
            std::thread::spawn(move || {
                let mut text = String::new();
                let _ = stream.read_to_string(&mut text);
                if let Ok(mut guard) = buffer.lock() {
                    guard.push_str(&text);
                }
            });
        }

        if let Some(stdout) = child.stdout.take() {
            for line in BufReader::new(stdout).lines().flatten() {
                if let Ok(event) = serde_json::from_str::<Value>(&line) {
                    let _ = app.emit("worker-event", event);
                }
            }
        }

        let status = child.wait().map_err(|error| error.to_string())?;
        if !status.success() {
            // Give the stderr reader a moment to flush before reading it.
            std::thread::sleep(Duration::from_millis(60));
            let log = stderr_buffer
                .lock()
                .map(|guard| guard.clone())
                .unwrap_or_default();
            let detail = tail(&log, 700);
            return Err(if detail.is_empty() {
                "The worker stopped unexpectedly. Make sure the Python dependencies are installed (python3 -m pip install -r scripts/requirements.txt).".to_string()
            } else {
                format!("Worker failed: {detail}")
            });
        }
        Ok(())
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Default model output folders, created up front so downloads never fail on a
/// missing directory.
#[tauri::command]
fn default_paths(app: tauri::AppHandle) -> Result<Value, String> {
    let data = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let pictures = app.path().picture_dir().unwrap_or_else(|_| data.clone());
    let models = data.join("models");
    let output = pictures.join("DreamCanvas");
    let _ = std::fs::create_dir_all(&models);
    let _ = std::fs::create_dir_all(&output);
    Ok(json!({
        "models": models.to_string_lossy(),
        "output": output.to_string_lossy()
    }))
}

/// Folders created by DreamCanvas contain a manifest with the Hugging Face id.
fn read_model_id(dir: &Path) -> Option<String> {
    let manifest = dir.join(".dreamcanvas-model.json");
    if let Ok(text) = std::fs::read_to_string(manifest) {
        if let Ok(value) = serde_json::from_str::<Value>(&text) {
            if let Some(id) = value.get("id").and_then(|item| item.as_str()) {
                if !id.is_empty() {
                    return Some(id.to_string());
                }
            }
        }
    }
    // Fall back to models downloaded before manifests existed.
    if dir.join("model_index.json").exists() {
        if let Some(name) = dir.file_name().and_then(|name| name.to_str()) {
            return Some(name.replace("--", "/"));
        }
    }
    None
}

#[tauri::command]
fn installed_models(path: String) -> Vec<String> {
    let mut ids: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries.flatten() {
            let dir = entry.path();
            if !dir.is_dir() {
                continue;
            }
            if let Some(id) = read_model_id(&dir) {
                if !ids.contains(&id) {
                    ids.push(id);
                }
            }
        }
    }
    ids
}

fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| matches!(extension.to_ascii_lowercase().as_str(), "png" | "jpg" | "jpeg" | "webp"))
        .unwrap_or(false)
}

#[tauri::command]
fn list_images(path: String) -> Vec<String> {
    let mut files: Vec<PathBuf> = std::fs::read_dir(path)
        .into_iter()
        .flatten()
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_image(path))
        .collect();
    files.sort_by(|a, b| b.cmp(a));
    files
        .into_iter()
        .take(200)
        .map(|path| path.to_string_lossy().to_string())
        .collect()
}

fn checked_image(path: &str, output: &str) -> Result<PathBuf, String> {
    let file = std::fs::canonicalize(path).map_err(|error| error.to_string())?;
    let dir = std::fs::canonicalize(output).map_err(|error| error.to_string())?;
    if !file.starts_with(&dir) || !is_image(&file) {
        return Err("Invalid image path".into());
    }
    Ok(file)
}

#[tauri::command]
fn image_data(path: String, output: String) -> Result<Vec<u8>, String> {
    let file = checked_image(&path, &output)?;
    std::fs::read(file).map_err(|error| error.to_string())
}

/// Copy a generated image wherever the user picked in the save dialog.
#[tauri::command]
fn save_image(path: String, output: String, destination: String) -> Result<(), String> {
    let file = checked_image(&path, &output)?;
    let mut target = PathBuf::from(&destination);
    if target.extension().is_none() {
        target.set_extension("png");
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    std::fs::copy(&file, &target).map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            run_worker,
            default_paths,
            installed_models,
            list_images,
            image_data,
            save_image
        ])
        .run(tauri::generate_context!())
        .expect("error running DreamCanvas");
}
