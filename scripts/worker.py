"""DreamCanvas worker.

A single, long-lived Python process that speaks newline-delimited JSON:

* stdin  — one command per line: ``{"action": "...", "args": {...}}``
* stdout — one event per line:   ``{"event": "...", ...fields}``

Keeping the process alive is what makes *load* / *unload* meaningful: the
Diffusers pipeline stays in RAM/VRAM between commands, so generating the next
image does not reload several gigabytes from disk.

Actions: ``hardware``, ``diagnose``, ``ping``, ``load``, ``unload``,
``generate``, ``download``, ``cancel`` (handled immediately while a task runs).
"""

import gc
import json
import os
import shutil
import sys
import threading
import time
import traceback
import urllib.request

try:  # Windows consoles may default to a legacy code page.
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # pragma: no cover
    pass

CANCEL = threading.Event()
BUSY = threading.Lock()
STATE = {"pipe": None, "model": None, "path": None, "device": None, "dtype": None}

SKIP_SUFFIXES = (
    ".md", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".onnx",
    ".msgpack", ".h5", ".ckpt", ".tflite", ".mlmodel", ".ot", ".pdf",
)


class Cancelled(Exception):
    pass


def emit(event, **kwargs):
    # ensure_ascii keeps the stream safe on every platform and code page.
    print(json.dumps({"event": event, **kwargs}, ensure_ascii=True), flush=True)


def friendly_error(exc):
    message = str(exc) or exc.__class__.__name__
    lowered = message.lower()

    if isinstance(exc, ImportError) or "no module named" in lowered:
        missing = getattr(exc, "name", "") or message
        return (
            f"{missing} is not installed. Run this once, then restart DreamCanvas:\n"
            "python3 -m pip install -r scripts/requirements.txt"
        )
    if "401" in message or "unauthorized" in lowered or "invalid username or password" in lowered:
        return (
            "Hugging Face rejected the request. If this model is gated, accept its licence "
            "on huggingface.co and start DreamCanvas with HF_TOKEN set."
        )
    if "403" in message or "gated" in lowered or "awaiting a review" in lowered:
        return "This model is gated. Accept its licence on Hugging Face and set HF_TOKEN before launching DreamCanvas."
    if "404" in message or "repository not found" in lowered or "revision not found" in lowered:
        return "That repository was not found on Hugging Face. Check the model id."
    if "connection" in lowered or "timed out" in lowered or "timeout" in lowered or "resolve" in lowered:
        return "Could not reach Hugging Face. Check the internet connection; downloads resume where they stopped."
    if "no space" in lowered or "disk" in lowered:
        return "The disk is full. Free some space and try again."
    if "permission" in lowered or "access is denied" in lowered:
        return "DreamCanvas is not allowed to write there. Choose another folder in Settings."
    if "out of memory" in lowered or "cuda out of memory" in lowered:
        return (
            "Not enough memory for this model. Unload other models, choose a smaller size, "
            "or switch the compute device to CPU."
        )
    return message


def folder_bytes(path):
    """Size of everything currently on disk below *path* (partial files included)."""
    total = 0
    try:
        for root, _dirs, files in os.walk(path):
            for name in files:
                try:
                    total += os.path.getsize(os.path.join(root, name))
                except OSError:
                    pass
    except OSError:
        pass
    return total


# --------------------------------------------------------------------------- #
# Environment
# --------------------------------------------------------------------------- #

def pick_device(requested):
    import torch

    if requested and requested not in ("auto", ""):
        device = requested
    else:
        if torch.cuda.is_available():
            device = "cuda"
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"

    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available. Install a CUDA-enabled PyTorch build or choose CPU.")
    if device == "mps" and not (getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()):
        raise RuntimeError("Apple MPS is not available here. Choose CPU or auto.")
    return device


def hardware():
    import torch

    cuda = torch.cuda.is_available()
    mps = bool(getattr(torch.backends, "mps", None) and torch.backends.mps.is_available())
    emit(
        "hardware",
        cuda=cuda,
        gpu=torch.cuda.get_device_name(0) if cuda else None,
        mps=mps,
        device="cuda" if cuda else ("mps" if mps else "cpu"),
        torch=torch.__version__,
    )


def diagnose(args):
    info = {"python": sys.version.split()[0], "executable": sys.executable, "platform": sys.platform}
    for module in ("torch", "diffusers", "transformers", "huggingface_hub", "safetensors", "PIL"):
        try:
            imported = __import__(module)
            info[module] = getattr(imported, "__version__", "installed")
        except Exception as exc:  # noqa: BLE001
            info[module] = f"missing ({exc.__class__.__name__})"

    try:
        import torch

        info["cuda"] = bool(torch.cuda.is_available())
        info["mps"] = bool(getattr(torch.backends, "mps", None) and torch.backends.mps.is_available())
        if info["cuda"]:
            info["gpu"] = torch.cuda.get_device_name(0)
    except Exception:
        info["cuda"] = False
        info["mps"] = False

    models_dir = args.get("models_dir")
    if models_dir:
        try:
            os.makedirs(models_dir, exist_ok=True)
            usage = shutil.disk_usage(models_dir)
            info["free_space"] = usage.free
            info["total_space"] = usage.total
            info["models_dir"] = models_dir
            info["writable"] = os.access(models_dir, os.W_OK)
        except Exception as exc:  # noqa: BLE001
            info["models_dir_error"] = friendly_error(exc)

    try:
        request = urllib.request.Request("https://huggingface.co/api/models/Lykon/dreamshaper-8", method="HEAD")
        with urllib.request.urlopen(request, timeout=6) as response:
            info["huggingface"] = f"reachable ({response.status})"
    except Exception as exc:  # noqa: BLE001
        info["huggingface"] = f"unreachable ({exc.__class__.__name__})"

    emit("diagnose", **info)


# --------------------------------------------------------------------------- #
# Load / unload
# --------------------------------------------------------------------------- #

def unload(quiet=False):
    had_model = STATE["pipe"] is not None
    STATE["pipe"] = None
    STATE["model"] = None
    STATE["path"] = None
    STATE["device"] = None
    STATE["dtype"] = None
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass
    if had_model and not quiet:
        emit("unloaded")
    return had_model


def load_pipeline(model_path, model_id, device_request):
    from diffusers import DiffusionPipeline
    import torch

    model_path = os.path.abspath(os.path.expanduser(model_path or ""))
    if not model_path or not os.path.isdir(model_path):
        raise RuntimeError("The model folder was not found. Download the model again from the Models page.")
    if not os.path.exists(os.path.join(model_path, "model_index.json")):
        raise RuntimeError(
            "This folder has no model_index.json, so it is not a Diffusers pipeline. "
            "Pick a Diffusers text-to-image repository."
        )

    device = pick_device(device_request)
    dtype = torch.float16 if device in ("cuda", "mps") else torch.float32

    emit("load-start", model=model_id, device=device)
    emit("status", message=f"Loading {model_id} on {device.upper()}…")
    started = time.time()

    if STATE["pipe"] is not None:
        unload(quiet=True)

    pipe = DiffusionPipeline.from_pretrained(model_path, torch_dtype=dtype, local_files_only=True)
    pipe = pipe.to(device)
    if hasattr(pipe, "enable_attention_slicing"):
        pipe.enable_attention_slicing()
    if hasattr(pipe, "set_progress_bar_config"):
        pipe.set_progress_bar_config(disable=True)

    elapsed = time.time() - started
    STATE.update({"pipe": pipe, "model": model_id, "path": model_path, "device": device, "dtype": str(dtype).replace("torch.", "")})

    vram = 0
    if device == "cuda":
        try:
            vram = int(torch.cuda.memory_allocated() / (1024 * 1024))
        except Exception:
            vram = 0

    emit(
        "loaded",
        model=model_id,
        device=device,
        dtype=STATE["dtype"],
        seconds=round(elapsed, 2),
        vram=vram,
    )
    return pipe


def ensure_pipeline(args):
    model_path = args.get("model_path")
    model_id = args.get("model") or os.path.basename(str(model_path or ""))
    device = args.get("device", "auto")

    same = (
        STATE["pipe"] is not None
        and STATE["path"] == os.path.abspath(os.path.expanduser(str(model_path or "")))
        and (STATE["device"] == device or device in ("auto", ""))
    )
    if same:
        return STATE["pipe"]
    return load_pipeline(model_path, model_id, device)


def load(args):
    load_pipeline(args.get("model_path"), args.get("model"), args.get("device", "auto"))


# --------------------------------------------------------------------------- #
# Generation
# --------------------------------------------------------------------------- #

def generate(args):
    import torch

    prompt = str(args.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("The prompt is empty.")

    output = str(args.get("output") or "").strip()
    if not output:
        raise RuntimeError("No output folder is configured. Choose one in Settings.")
    os.makedirs(output, exist_ok=True)

    count = max(1, min(50, int(args.get("count", 1) or 1)))
    steps = max(1, min(150, int(args.get("steps", 30) or 30)))
    guidance = max(0.0, min(30.0, float(args.get("guidance", 7.5) or 0)))
    width = max(256, min(1536, int(args.get("width", 512) or 512)))
    height = max(256, min(1536, int(args.get("height", 512) or 512)))
    width -= width % 8
    height -= height % 8
    seed = int(args.get("seed", -1) or -1)
    negative = str(args.get("negative") or "").strip() or None

    pipe = ensure_pipeline(args)
    device = STATE["device"] or "cpu"
    emit("status", message=f"Creating {count} image{'s' if count > 1 else ''} on {device.upper()}…")

    generated = 0
    started = time.time()
    with torch.inference_mode():
        for index in range(count):
            if CANCEL.is_set():
                raise Cancelled()
            image_seed = seed + index if seed >= 0 else int.from_bytes(os.urandom(4), "big")
            emit("status", message=f"Image {index + 1} of {count}")

            def callback(_pipe, step, _timestep, callback_kwargs, _index=index):
                if CANCEL.is_set():
                    raise Cancelled()
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
            emit(
                "image",
                path=path,
                seed=image_seed,
                prompt=prompt,
                model=STATE["model"],
                current=index + 1,
                count=count,
            )

            if CANCEL.is_set():
                raise Cancelled()

    emit("done", task="generate", count=generated, seconds=round(time.time() - started, 1), vram=vram_used(device))


def vram_used(device):
    if device != "cuda":
        return 0
    try:
        import torch

        return int(torch.cuda.memory_allocated() / (1024 * 1024))
    except Exception:
        return 0


# --------------------------------------------------------------------------- #
# Download
# --------------------------------------------------------------------------- #

def plan_download_files(api, repo):
    info = api.model_info(repo_id=repo, files_metadata=True)
    files = []
    for sibling in getattr(info, "siblings", []) or []:
        name = getattr(sibling, "rfilename", "") or ""
        if not name or name.startswith(".git"):
            continue
        if name.lower().endswith(SKIP_SUFFIXES):
            continue
        files.append((name, int(getattr(sibling, "size", 0) or 0)))

    # Repos that ship both formats would otherwise download the weights twice.
    safetensor_dirs = {os.path.dirname(name) for name, _size in files if name.endswith(".safetensors")}
    files = [(name, size) for name, size in files if not (name.endswith(".bin") and os.path.dirname(name) in safetensor_dirs)]
    return info, files


def download(args):
    from huggingface_hub import HfApi, hf_hub_download

    repo = str(args.get("model") or "").strip()
    target = str(args.get("path") or "").strip()
    if "/" not in repo:
        raise ValueError("Enter a model id like username/model-name.")
    if not target:
        raise ValueError("No download folder is configured. Choose one in Settings.")

    target = os.path.abspath(os.path.expanduser(target))
    os.makedirs(target, exist_ok=True)
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or None

    emit("status", message=f"Reading the file list of {repo} from Hugging Face…")
    api = HfApi(token=token)
    info, files = plan_download_files(api, repo)
    if not files:
        raise RuntimeError("This repository has no downloadable model files.")

    total = sum(size for _name, size in files)
    emit("download-plan", model=repo, files=len(files), total=total)
    emit("status", message=f"{len(files)} files · {total / 1048576:.0f} MB to fetch")

    started = time.time()
    for index, (name, size) in enumerate(files, start=1):
        if CANCEL.is_set():
            raise Cancelled()
        emit("download-file", model=repo, file=name, index=index, count=len(files))
        emit("status", message=f"File {index} of {len(files)}: {name}")

        error = {}

        def worker(name=name, error=error):
            try:
                hf_hub_download(
                    repo_id=repo,
                    filename=name,
                    local_dir=target,
                    token=token,
                    etag_timeout=30,
                )
            except Exception as exc:  # noqa: BLE001
                error["exc"] = exc

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()

        last_bytes = folder_bytes(target)
        last_time = time.time()
        stopping = False
        while thread.is_alive():
            time.sleep(0.45)
            if CANCEL.is_set() and not stopping:
                # A single HTTP download cannot be interrupted safely; finish this
                # file, then stop before the next one so nothing is left half written.
                stopping = True
                emit("status", message="Finishing the current file, then stopping…")
            current = folder_bytes(target)
            now = time.time()
            speed = (current - last_bytes) / max(0.001, now - last_time)
            last_bytes, last_time = current, now
            emit(
                "download",
                model=repo,
                file=name,
                current=min(current, total) if total else current,
                total=total,
                speed=max(0.0, speed),
            )

        thread.join()
        if stopping:
            raise Cancelled()
        if "exc" in error:
            raise error["exc"]

        _ = size  # size may be missing for some repos; folder size is authoritative

    manifest = {"app": "DreamCanvas", "id": repo, "downloaded_at": int(time.time())}
    try:
        with open(os.path.join(target, ".dreamcanvas-model.json"), "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, ensure_ascii=False, indent=2)
    except OSError:
        pass

    ready = os.path.exists(os.path.join(target, "model_index.json"))
    emit(
        "downloaded",
        model=repo,
        path=target,
        size=folder_bytes(target),
        ready=ready,
        seconds=round(time.time() - started, 1),
    )
    if not ready:
        emit(
            "status",
            message="Files downloaded, but no model_index.json was found — this may not be a Diffusers text-to-image model.",
        )


# --------------------------------------------------------------------------- #
# Command loop
# --------------------------------------------------------------------------- #

ACTIONS = {
    "hardware": lambda _args: hardware(),
    "diagnose": diagnose,
    "load": load,
    "unload": lambda _args: unload(),
    "generate": generate,
    "download": download,
}


def run_task(action, args):
    if not BUSY.acquire(blocking=False):
        emit("error", message="The worker is busy. Wait for the current task to finish.")
        return
    CANCEL.clear()
    emit("task-start", task=action)
    try:
        ACTIONS[action](args or {})
    except Cancelled:
        emit("cancelled", task=action)
        if action == "generate":
            emit("status", message="Generation cancelled")
    except Exception as exc:  # noqa: BLE001
        emit("error", task=action, message=friendly_error(exc))
        traceback.print_exc(file=sys.stderr)
    finally:
        emit("task-end", task=action)
        BUSY.release()


def main():
    emit(
        "ready",
        pid=os.getpid(),
        python=sys.version.split()[0],
        executable=sys.executable,
        platform=sys.platform,
    )

    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            emit("error", message="The worker received a malformed command.")
            continue

        action = str(message.get("action") or "")
        args = message.get("args") or {}

        if action == "cancel":
            CANCEL.set()
            emit("cancel-requested")
            continue
        if action == "ping":
            emit("pong", busy=BUSY.locked())
            continue
        if action not in ACTIONS:
            emit("error", message=f"Unknown action: {action}")
            continue

        threading.Thread(target=run_task, args=(action, args), daemon=True).start()

    unload(quiet=True)
    emit("bye")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as exc:  # noqa: BLE001
        emit("error", message=friendly_error(exc))
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
