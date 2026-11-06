# DreamCanvas

A Tauri 2 desktop studio for running Hugging Face Diffusers models **locally**. Your prompts, models and images never leave your computer — only model weights are fetched from Hugging Face.

The interface is bilingual (فارسی / English), ships with a dark "midnight aurora" theme and a light theme, and works right-to-left when Persian is selected.

## What is new in 0.4.0

- **Models can be managed properly.** The Models page has a storage bar (folder, count, size, free space), an *Installed models* section with each model's size and file count, and actions to **load**, **unload**, open the folder, select, or **delete** a model from disk.
- **Load / unload actually mean something.** The Python worker is now a single long-lived process. Loading a model keeps the Diffusers pipeline in RAM/VRAM, so the next image starts in seconds instead of reloading gigabytes every time. Unload frees the memory (and the CUDA cache) immediately.
- **Generation loads on demand.** Pressing *Generate* loads the selected model automatically when needed, so a fresh start still works with one click.
- **Downloads are visible and cancellable.** Files are fetched one by one with per-file progress, overall byte progress, speed and a *Stop* button; the current file is finished safely before stopping, and retrying resumes. Repositories that ship both `safetensors` and `.bin` weights only download one copy.
- **The app can explain itself.** An *Environment check* reports Python, PyTorch, Diffusers, `huggingface_hub`, CUDA/MPS, free disk space and whether Hugging Face is reachable, and worker errors surface in the interface with the fix (install command, `HF_TOKEN`, disk space, …).
- **New interface**: grouped sidebar, animated canvas, gallery lightbox, per-image metadata, save-as / reveal in folder, toasts, RTL/LTR, keyboard shortcuts and a ~88 kB front-end bundle.

## Requirements

- Rust and the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/), Node.js 20+, Python 3.10–3.12 and pip.
- Install the Python worker dependencies in the environment that will run the app:

  ```sh
  python3 -m pip install -r scripts/requirements.txt
  npm ci
  npm run tauri dev
  ```

  On Windows use `python` instead of `python3`. If needed, set `DREAMCANVAS_PYTHON` to the full path of your interpreter before launching the app. Python and its packages are **not bundled**. For NVIDIA acceleration install the CUDA-enabled PyTorch build from pytorch.org; GPU detection only reports devices supported by the installed PyTorch (or Apple MPS). CPU inference is slow and needs plenty of RAM.
- Internet is needed for model downloads and update checks. Gated Hugging Face models require accepting their licence and setting `HF_TOKEN` in the app's environment.
- The translate button opens Google Translate with your prompt; copy the result back. Nothing is sent until you click it.

## Downloading and managing models

1. Open **Models**. The top bar shows the model folder, how many models are installed, their total size and the free space on that disk.
2. Press **Download model** on a catalogue card (or paste any Diffusers-compatible repository id at the bottom). Progress, speed, the current file and the overall percentage appear in the card and in the job panel; **Stop** halts after the current file and keeps the partial data for a resume.
3. When the download finishes the model appears under **Installed models**, is marked *Ready* (a Diffusers `model_index.json` was found) and is selected for you.

A model folder holds everything on disk; the size and file count shown come from the file system, not from a saved flag. **Delete** asks for confirmation and removes the folder from disk, unloading it first if necessary.

## Load, unload and generate

- **Load** puts the model into memory on the selected device (`auto`, CPU, CUDA or MPS) and reports the device, dtype and load time. Only one model stays loaded; loading another replaces it.
- **Unload** frees the pipeline and the CUDA cache.
- **Generate** uses the loaded model, or loads the selected one first. Long jobs show the current step, percentage, elapsed time and a **Stop** button.
- Images are written as PNGs to your output folder. Use **Save as…** under the canvas, or the download button in the gallery / lightbox, to copy one anywhere; **Show in folder** reveals the original file.

## Troubleshooting

Open **Settings → Environment check**. It runs inside the worker and lists the Python version, installed packages, CUDA/MPS availability, whether the model folder is writable, free space and Hugging Face reachability. Missing packages are reported by name with the command to install them:

```sh
python3 -m pip install -r scripts/requirements.txt
```

If the worker process stops, **Restart worker** starts a new one without restarting the app.

## Releases and updates

Push a version tag (for example `v0.4.0`) to run the release workflow. It creates Debian, AppImage and RPM bundles plus a Windows portable ZIP containing the EXE and worker scripts. Keep the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` in sync before tagging; the app reads its version from `package.json` and compares it with the latest GitHub release.

The app checks GitHub's latest release at startup and from Settings. A newer version opens the release page for a **manual download and installation**; automatic in-app installation is not implemented. Bundles are not code-signed by this workflow.

## Model catalogue and the worker

The desktop shell is Rust/Tauri; inference, downloads and device detection run in one local Python process that speaks newline-delimited JSON. The Rust side keeps that process alive and forwards events to the interface.

The Models page fetches the curated `catalog/models.json` from the latest GitHub release (falling back to `main` and then to the bundled copy). Model weights are downloaded from Hugging Face, not GitHub. The catalogue is curated rather than a complete search; any Diffusers-compatible repository id can be entered manually. Check each model's licence, requirements and recommended settings before use.

Rust commands: `worker_start`, `worker_send`, `worker_stop`, `default_paths`, `installed_models`, `delete_model`, `list_images`, `image_data`, `save_image`. `image_data`, `save_image` and `delete_model` only touch paths inside the configured folders.

## Development checks

`.github/workflows/check.yml` runs on every branch push: it builds the front end, compiles `scripts/worker.py` and runs `cargo check` for the Tauri crate.
