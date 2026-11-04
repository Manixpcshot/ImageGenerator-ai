# DreamCanvas

A Tauri 2 desktop studio for running Hugging Face Diffusers models **locally**. Your prompts, models and images never leave your computer — only model weights are fetched from Hugging Face.

The interface is bilingual (فارسی / English), ships with a dark "midnight aurora" theme and a light theme, and works right-to-left when Persian is selected.

## What is new in 0.3.0

- **Downloads actually report what is happening.** The worker now streams byte progress, speed and the current file; the Python side creates the destination folder, writes a small `.dreamcanvas-model.json` manifest and verifies `model_index.json` when it finishes.
- **Failures are visible.** The Rust shell used to discard the worker's stderr, so a broken Python environment looked like "nothing happens". stderr is now drained safely and surfaced as a readable message with the install command, and library errors (gated models, 401/403, offline, disk full) are translated into actionable text.
- **Installed models are read from disk** instead of a stale `localStorage` flag, and freshly downloaded models are selected automatically.
- **Images can be saved anywhere** with a native save dialog, revealed in the file manager, or downloaded from the gallery and the lightbox. The new `save_image` command validates that the file really lives inside your output folder.
- **New interface**: grouped sidebar, studio split view, live canvas with an animated generating state, gallery with per-image actions, a rebuilt model library, organised settings, toasts instead of `alert()`, keyboard shortcuts (`⌘/Ctrl + ↵`, `Esc`, arrow keys in the lightbox), reduced-motion support and a 70 kB front-end bundle.
- Long jobs show the current file or step, the percentage and elapsed time, so the app is never a silent black box.

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

## Downloading models

1. Open **Models** and press **Download model** on a card (or paste any Diffusers-compatible repository id at the bottom).
2. Progress, speed and the current file appear in the card, on the canvas badge and in the job card. Interrupted downloads resume when retried.
3. When the worker finishes, the model is marked **Downloaded**, selected for you, and the status line reports whether a Diffusers `model_index.json` was found.

Downloads go to the model folder shown in **Settings**. If the folder is missing it is created for you, so the first download cannot fail on a missing directory. Sizes in the catalogue are approximate and the disk usage of a model may differ.

## Generating and saving images

Pick a downloaded model, write a prompt (Persian or English), choose size/seed and press **Generate image**. Images are written as PNGs to your output folder. Use **Save as…** under the canvas, or the download button in the gallery / lightbox, to copy one anywhere; **Show in folder** reveals the original file.

## Releases and updates

Push a version tag (for example `v0.3.0`) to run the release workflow. It creates Debian, AppImage and RPM bundles plus a Windows portable ZIP containing the EXE and worker scripts. Keep the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` in sync before tagging; the app reads its version from `package.json` and compares it with the latest GitHub release.

The app checks GitHub's latest release at startup and from Settings. A newer version opens the release page for a **manual download and installation**; automatic in-app installation is not implemented. Bundles are not code-signed by this workflow.

## Model catalogue and the worker

The desktop shell is Rust/Tauri; inference, model downloads and GPU detection run in a separate local Python worker that streams newline-delimited JSON events.

The Models page fetches the curated `catalog/models.json` from the latest GitHub release (falling back to `main` and then to the bundled copy). Model weights are downloaded from Hugging Face, not GitHub. The catalogue is curated rather than a complete search; any Diffusers-compatible repository id can be entered manually. Check each model's licence, requirements and recommended settings before use.

The Rust side exposes `run_worker`, `default_paths`, `installed_models`, `list_images`, `image_data` and `save_image`. `image_data` and `save_image` only read files inside the configured output folder.
