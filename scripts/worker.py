"""DreamCanvas local inference worker.

Every message written to stdout is a single line of JSON. The Tauri shell reads
those lines and forwards them to the interface as ``worker-event`` payloads.
Errors are reported both as an ``error`` event and through a non-zero exit code
so the interface can show a useful message instead of failing silently.
"""

import json
import os
import sys
import time
import traceback


def emit(event, **kwargs):
    print(json.dumps({"event": event, **kwargs}), flush=True)


def friendly_error(exc):
    """Turn noisy library exceptions into something a person can act on."""
    message = str(exc) or exc.__class__.__name__
    lowered = message.lower()

    if isinstance(exc, ImportError) or "no module named" in lowered:
        missing = getattr(exc, "name", "") or message
        return (
            f"{missing} is missing. Install the worker dependencies once:\n"
            "python3 -m pip install -r scripts/requirements.txt"
        )
    if "401" in message or "unauthorized" in lowered or "invalid username or password" in lowered:
        return (
            "Hugging Face rejected the request. If this model is gated, accept its "
            "license on huggingface.co and start the app with HF_TOKEN set."
        )
    if "403" in message or "gated" in lowered or "awaiting a review" in lowered:
        return "This model is gated. Accept its license on Hugging Face and set HF_TOKEN before launching DreamCanvas."
    if "404" in message or "repository not found" in lowered:
        return "That model repository was not found on Hugging Face. Check the repository id."
    if "connection" in lowered or "timed out" in lowered or "offline" in lowered or "resolve" in lowered:
        return "Could not reach Hugging Face. Check the internet connection and try again; downloads resume where they stopped."
    if "no space" in lowered or "disk" in lowered:
        return "The disk is full. Free some space and try the download again."
    if "permission" in lowered or "access is denied" in lowered:
        return "DreamCanvas is not allowed to write to that folder. Choose another folder in Settings."
    return message


# --------------------------------------------------------------------------- #
# Download
# --------------------------------------------------------------------------- #

def _progress_class():
    """Build a tqdm subclass that streams byte progress; tolerate missing tqdm."""
    try:
        from tqdm.auto import tqdm
    except Exception:  # pragma: no cover - tqdm ships with huggingface_hub
        return None

    class Progress(tqdm):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._last_emit = 0.0

        def update(self, n=1):
            result = super().update(n)
            try:
                now = time.monotonic()
                if (
                    getattr(self, "total", None)
                    and getattr(self, "unit", "") == "B"
                    and now - self._last_emit > 0.15
                ):
                    self._last_emit = now
                    emit(
                        "download",
                        name=str(self.desc or "model file"),
                        current=int(self.n or 0),
                        total=int(self.total or 0),
                        speed=float(self.format_dict.get("rate") or 0),
                    )
            except Exception:
                pass
            return result

    return Progress


def download(args):
    try:
        from huggingface_hub import snapshot_download
    except ImportError as exc:
        raise RuntimeError(friendly_error(exc)) from exc

    repo = str(args.get("model") or "").strip()
    target = str(args.get("path") or "").strip()
    if not repo or "/" not in repo:
        raise ValueError("Enter a model id like username/model-name.")
    if not target:
        raise ValueError("No download folder is configured. Choose one in Settings.")

    target = os.path.abspath(os.path.expanduser(target))
    os.makedirs(target, exist_ok=True)

    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or None
    emit("status", message=f"Connecting to Hugging Face: {repo}")
    emit("download", name="preparing", current=0, total=0, speed=0)

    progress_cls = _progress_class()
    kwargs = dict(repo_id=repo, local_dir=target, token=token, max_workers=8)
    if progress_cls is not None:
        try:
            path = snapshot_download(tqdm_class=progress_cls, **kwargs)
        except TypeError as exc:
            if "tqdm_class" not in str(exc):
                raise
            path = snapshot_download(**kwargs)
    else:
        path = snapshot_download(**kwargs)

    # A small manifest lets the app recognise folders it created, and keeps the
    # Hugging Face id next to the weights instead of guessing from the folder name.
    manifest = {
        "app": "DreamCanvas",
        "id": repo,
        "downloaded_at": int(time.time()),
    }
    try:
        with open(os.path.join(target, ".dreamcanvas-model.json"), "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, ensure_ascii=False, indent=2)
    except OSError:
        pass

    if not os.path.exists(os.path.join(target, "model_index.json")):
        emit(
            "status",
            message=(
                "Download finished, but no model_index.json was found. "
                "This repository may not be a Diffusers text-to-image model."
            ),
        )
    else:
        emit("status", message="Model verified and ready")

    emit("download", name="complete", current=1, total=1, speed=0)
    emit("complete", path=path or target)


# --------------------------------------------------------------------------- #
# Generation
# --------------------------------------------------------------------------- #

def pick_device(requested):
    import torch

    if requested and requested != "auto":
        device = requested
    else:
        device = "cuda" if torch.cuda.is_available() else ("mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu")

    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available. Install a CUDA-enabled PyTorch build or choose CPU.")
    if device == "mps" and not (getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()):
        raise RuntimeError("Apple MPS is not available on this machine. Choose CPU or auto.")
    return device


def generation(args):
    import torch
    from diffusers import DiffusionPipeline

    model_path = str(args.get("model_path") or "").strip()
    output = str(args.get("output") or "").strip()
    prompt = str(args.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("The prompt is empty.")
    if not model_path or not os.path.isdir(model_path):
        raise RuntimeError("The model folder was not found. Download the model again from the Models page.")
    if not output:
        raise RuntimeError("No output folder is configured. Choose one in Settings.")

    device = pick_device(args.get("device", "auto"))
    count = max(1, min(50, int(args.get("count", 1) or 1)))
    steps = max(1, min(150, int(args.get("steps", 30) or 30)))
    guidance = max(0.0, min(30.0, float(args.get("guidance", 7.5) or 0)))
    width = max(256, min(1536, int(args.get("width", 512) or 512)))
    height = max(256, min(1536, int(args.get("height", 512) or 512)))
    width -= width % 8
    height -= height % 8
    seed = int(args.get("seed", -1) or -1)

    os.makedirs(output, exist_ok=True)

    emit("status", message=f"Loading model on {device.upper()}")
    dtype = torch.float16 if device in ("cuda", "mps") else torch.float32
    pipe = DiffusionPipeline.from_pretrained(model_path, torch_dtype=dtype, local_files_only=True)
    pipe = pipe.to(device)
    if hasattr(pipe, "enable_attention_slicing"):
        pipe.enable_attention_slicing()
    if hasattr(pipe, "set_progress_bar_config"):
        pipe.set_progress_bar_config(disable=True)

    negative = str(args.get("negative") or "").strip() or None
    generated = 0
    with torch.inference_mode():
        for index in range(count):
            image_seed = seed + index if seed >= 0 else int.from_bytes(os.urandom(4), "big")
            emit("status", message=f"Creating image {index + 1} of {count}")

            def callback(_pipe, step, _timestep, callback_kwargs, _index=index):
                emit("generation", current=_index, count=count, step=step + 1, steps=steps)
                return callback_kwargs

            generator = torch.Generator(device="cpu").manual_seed(image_seed)
            result = pipe(
                prompt=prompt,
                negative_prompt=negative,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=guidance,
                generator=generator,
                callback_on_step_end=callback,
            ).images[0]

            path = os.path.join(output, f"dreamcanvas-{int(time.time() * 1000)}-{image_seed}.png")
            result.save(path)
            generated += 1
            emit("image", path=path, seed=image_seed, current=index + 1, count=count)

    try:
        del pipe
    except Exception:
        pass
    if device == "cuda":
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass

    emit("complete", message="Generation complete", count=generated)


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    raw_args = sys.argv[2] if len(sys.argv) > 2 else "{}"
    try:
        args = json.loads(raw_args)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid arguments passed to the worker: {exc}") from exc

    if action == "hardware":
        import torch

        cuda = torch.cuda.is_available()
        mps = bool(getattr(torch.backends, "mps", None) and torch.backends.mps.is_available())
        emit(
            "hardware",
            cuda=cuda,
            gpu=torch.cuda.get_device_name(0) if cuda else None,
            mps=mps,
        )
    elif action == "download":
        download(args)
    elif action == "generate":
        generation(args)
    else:
        raise ValueError(f"Unknown action: {action}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - the message is forwarded to the UI
        emit("error", message=friendly_error(exc))
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
