use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, Command, Stdio},
    sync::Mutex,
};
use tauri::{Emitter, Manager};

/// Keep one Python process alive so a loaded Diffusers pipeline survives between
/// commands. Starting a fresh interpreter per image used to reload gigabytes.
#[derive(Default)]
struct WorkerProc {
    child: Mutex<Option<Child>>,
    stdin: Mutex<Option<ChildStdin>>,
}

impl WorkerProc {
    fn shutdown(&self) {
        if let Ok(mut stdin) = self.stdin.lock() {
            *stdin = None;
        }
        if let Ok(mut slot) = self.child.lock() {
            if let Some(mut child) = slot.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

fn python_binary() -> String {
    std::env::var("DREAMCANVAS_PYTHON").unwrap_or_else(|_| if cfg!(windows) { "python".into() } else { "python3".into() })
}

fn worker_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(resources) = app.path().resource_dir() {
        let bundled = resources.join("worker.py");
        if bundled.exists() {
            return Ok(bundled);
        }
    }
    // Portable builds keep worker.py next to the executable.
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            for candidate in [dir.join("worker.py"), dir.join("scripts").join("worker.py")] {
                if candidate.exists() {
                    return Ok(candidate);
                }
            }
        }
    }
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts/worker.py");
    if dev.exists() {
        return Ok(dev);
    }
    Err(format!(
        "worker.py was not found next to the app, in its resources, or at {}. Reinstall DreamCanvas or run it from the repository.",
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

/// Start (or restart) the Python worker and stream its events to the interface.
#[tauri::command]
fn worker_start(app: tauri::AppHandle, state: tauri::State<'_, WorkerProc>) -> Result<(), String> {
    state.shutdown();

    let script = worker_path(&app)?;
    let python = python_binary();
    let mut command = Command::new(&python);
    command
        .arg(&script)
        .arg("serve")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = command.spawn().map_err(|error| {
        format!(
            "Could not start Python ({python}): {error}. Install Python 3.10+ and run `python3 -m pip install -r scripts/requirements.txt`, or set DREAMCANVAS_PYTHON to the full path of your interpreter."
        )
    })?;

    let stdin = child.stdin.take().ok_or("Could not open the worker's input stream")?;
    let stdout = child.stdout.take().ok_or("Could not open the worker's output stream")?;

    // Keep Python's diagnostics for error reporting instead of dropping them.
    if let Some(mut stderr) = child.stderr.take() {
        let app_errors = app.clone();
        std::thread::spawn(move || {
            use std::io::Read;
            let mut text = String::new();
            let _ = stderr.read_to_string(&mut text);
            if !text.trim().is_empty() {
                let _ = app_errors.emit("worker-event", json!({"event": "worker-log", "message": tail(&text, 1500)}));
            }
        });
    }

    {
        let app_reader = app.clone();
        std::thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line) {
                    Ok(0) => break,
                    Ok(_) => {
                        let trimmed = line.trim();
                        if trimmed.is_empty() {
                            continue;
                        }
                        match serde_json::from_str::<Value>(trimmed) {
                            Ok(event) => {
                                let _ = app_reader.emit("worker-event", event);
                            }
                            Err(_) => {
                                let _ = app_reader.emit("worker-event", json!({"event": "worker-log", "message": tail(trimmed, 400)}));
                            }
                        }
                    }
                    Err(_) => break,
                }
            }
            let _ = app_reader.emit("worker-event", json!({"event": "worker-exit"}));
        });
    }

    *state.stdin.lock().map_err(|_| "Worker state is poisoned".to_string())? = Some(stdin);
    *state.child.lock().map_err(|_| "Worker state is poisoned".to_string())? = Some(child);
    Ok(())
}

/// Forward one command to the worker's stdin.
#[tauri::command]
fn worker_send(state: tauri::State<'_, WorkerProc>, action: String, args: Value) -> Result<(), String> {
    let mut guard = state.stdin.lock().map_err(|_| "Worker state is poisoned".to_string())?;
    let stdin = guard
        .as_mut()
        .ok_or("The Python worker is not running. Use “Restart worker” in Settings.")?;
    let payload = json!({ "action": action, "args": args });
    writeln!(stdin, "{payload}").map_err(|error| error.to_string())?;
    stdin.flush().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn worker_stop(state: tauri::State<'_, WorkerProc>) -> Result<(), String> {
    state.shutdown();
    Ok(())
}

/// Default folders, created up front so a download cannot fail on a missing path.
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
    if dir.join("model_index.json").exists() {
        if let Some(name) = dir.file_name().and_then(|name| name.to_str()) {
            return Some(name.replace("--", "/"));
        }
    }
    None
}

/// Bytes and file count of a model folder, ignoring the download cache.
fn dir_stats(dir: &Path) -> (u64, u64) {
    let mut size = 0u64;
    let mut files = 0u64;
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        let entries = match std::fs::read_dir(&current) {
            Ok(entries) => entries,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let hidden = path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .map(|name| name == ".cache")
                    .unwrap_or(false);
                if !hidden {
                    stack.push(path);
                }
            } else if let Ok(meta) = entry.metadata() {
                size += meta.len();
                files += 1;
            }
        }
    }
    (size, files)
}

#[tauri::command]
fn installed_models(path: String) -> Vec<Value> {
    let mut items: Vec<Value> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries.flatten() {
            let dir = entry.path();
            if !dir.is_dir() {
                continue;
            }
            let id = match read_model_id(&dir) {
                Some(id) => id,
                None => continue,
            };
            let (size, files) = dir_stats(&dir);
            items.push(json!({
                "id": id,
                "name": id.split('/').last().unwrap_or(&id),
                "path": dir.to_string_lossy(),
                "size": size,
                "files": files,
                "ready": dir.join("model_index.json").exists(),
            }));
        }
    }
    items.sort_by(|a, b| b["size"].as_u64().cmp(&a["size"].as_u64()));
    items
}

#[tauri::command]
fn delete_model(models_dir: String, path: String) -> Result<(), String> {
    let root = std::fs::canonicalize(&models_dir).map_err(|error| error.to_string())?;
    let target = std::fs::canonicalize(&path).map_err(|error| error.to_string())?;
    if !target.starts_with(&root) || target == root {
        return Err("Refusing to delete a folder outside the model library.".into());
    }
    if !target.join("model_index.json").exists() && !target.join(".dreamcanvas-model.json").exists() {
        return Err("That folder does not look like a DreamCanvas model.".into());
    }
    std::fs::remove_dir_all(&target).map_err(|error| error.to_string())
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
        .manage(WorkerProc::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            worker_start,
            worker_send,
            worker_stop,
            default_paths,
            installed_models,
            delete_model,
            list_images,
            image_data,
            save_image
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.app_handle().state::<WorkerProc>();
                state.shutdown();
            }
        })
        .run(tauri::generate_context!())
        .expect("error running DreamCanvas");
}
