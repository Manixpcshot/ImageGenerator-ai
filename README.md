# DreamCanvas

A Tauri 2 desktop studio for running Hugging Face Diffusers models locally. English is the default; switch to Persian in the header. Download DreamShaper 8 from Models, then generate single images or a sequential queue of up to 50. Images are saved as PNGs in your selected output folder. Models can be many gigabytes; downloads display progress and speed for the current file, not the whole repository.

## Requirements

- Rust and the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/), Node.js 20+, Python 3.10–3.12 and pip.
- Install the Python worker dependencies in the Python environment that will run the app:

  ```sh
  python3 -m pip install -r scripts/requirements.txt
  npm ci
  npm run tauri dev
  ```

  On Windows use `python` instead of `python3`. If needed set `DREAMCANVAS_PYTHON` to the full path of your Python executable before launching the app. Python and its packages are **not bundled**. For NVIDIA acceleration, install the appropriate CUDA-enabled PyTorch build from pytorch.org; GPU detection only reports CUDA devices supported by the installed PyTorch (or Apple MPS). CPU inference can be very slow and needs substantial RAM.
- Internet is needed for model downloads and update checks. Gated Hugging Face models require accepting their license on Hugging Face and setting `HF_TOKEN` in the app's environment. Custom models must be Diffusers-compatible text-to-image repositories; not every architecture supports all controls.
- The translation button opens Google Translate with the prompt; copy the translated text back into the app. It does not silently send prompts until clicked.

## Releases and updates

Push a version tag (for example `v0.1.0`) to run the release workflow. It creates Debian, AppImage and RPM bundles plus a Windows portable ZIP containing the EXE and worker scripts. GitHub automatically attaches source archives to tagged releases. Keep the version in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and the update check in `src/main.js` in sync before tagging. Manual workflow runs produce artifacts but do not publish a release. A release is not created on every ordinary commit: tag each version when ready.

The app checks GitHub's latest release at startup and can check again in Settings. A newer version opens the release page for a **manual download and installation**; automatic in-app installation is not implemented. Production auto-installation requires a signed Tauri updater and a securely managed signing key. Bundles are not code-signed by this workflow.

The worker runs locally, and generated images are not uploaded. Hugging Face receives model download requests. Installing third-party models and dependencies is at your own discretion.

## Model catalog and Windows console

The desktop shell is Rust/Tauri; image inference, model downloads, and GPU detection run in a separate local Python worker. On Windows, release builds hide the app console and start the worker without a console window. Python is still required separately.

The Models page fetches the curated `catalog/models.json` from the latest GitHub release and falls back to its bundled catalog when offline or unavailable. Model weights themselves are downloaded from Hugging Face, not GitHub. The catalog is curated rather than a complete search of either service; custom Diffusers-compatible Hugging Face repository IDs can also be entered. Check each model's license, requirements, and recommended settings before use.
