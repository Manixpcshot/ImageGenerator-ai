"""DreamCanvas local inference worker. Events are newline-delimited JSON on stdout."""
import json, os, sys, time, traceback

def emit(event, **kwargs):
    print(json.dumps({'event': event, **kwargs}), flush=True)

def main():
    action = sys.argv[1]
    args = json.loads(sys.argv[2])
    if action == 'hardware':
        import torch
        emit('hardware', cuda=torch.cuda.is_available(), gpu=torch.cuda.get_device_name(0) if torch.cuda.is_available() else None, mps=bool(getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available()))
    elif action == 'download':
        from huggingface_hub import snapshot_download
        from tqdm.auto import tqdm
        class Progress(tqdm):
            def update(self, n=1):
                result = super().update(n)
                if self.total and self.unit == 'B':
                    emit('download', name=str(self.desc or 'Downloading'), current=self.n, total=self.total, speed=(self.format_dict.get('rate') or 0))
                return result
        path = snapshot_download(repo_id=args['model'], local_dir=args['path'], token=os.environ.get('HF_TOKEN'), tqdm_class=Progress)
        emit('complete', path=path)
    elif action == 'generate':
        import torch
        from diffusers import StableDiffusionPipeline, DiffusionPipeline
        device = args.get('device', 'auto')
        if device == 'auto': device = 'cuda' if torch.cuda.is_available() else ('mps' if getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available() else 'cpu')
        if device == 'cuda' and not torch.cuda.is_available(): raise RuntimeError('CUDA is not available. Install a CUDA-enabled PyTorch build or choose CPU.')
        emit('status', message='Loading model on ' + device.upper())
        dtype = torch.float16 if device in ('cuda', 'mps') else torch.float32
        pipe = DiffusionPipeline.from_pretrained(args['model_path'], torch_dtype=dtype, local_files_only=True)
        pipe = pipe.to(device)
        if hasattr(pipe, 'enable_attention_slicing'): pipe.enable_attention_slicing()
        os.makedirs(args['output'], exist_ok=True)
        count = int(args['count'])
        for i in range(count):
            seed = int(args['seed']) + i if int(args['seed']) >= 0 else int.from_bytes(os.urandom(4), 'big')
            emit('status', message=f'Creating image {i+1} of {count}')
            generator = torch.Generator(device='cpu').manual_seed(seed)
            def callback(pipeline, step, timestep, callback_kwargs):
                emit('generation', current=i, count=count, step=step+1, steps=int(args['steps']))
                return callback_kwargs
            image = pipe(prompt=args['prompt'], negative_prompt=args.get('negative') or None, width=int(args['width']), height=int(args['height']), num_inference_steps=int(args['steps']), guidance_scale=float(args['guidance']), generator=generator, callback_on_step_end=callback).images[0]
            path = os.path.join(args['output'], f'dreamcanvas-{int(time.time()*1000)}-{seed}.png')
            image.save(path)
            emit('image', path=path, seed=seed, current=i+1, count=count)
        emit('complete', message='Generation complete')
    else: raise ValueError('Unknown action')

if __name__ == '__main__':
    try: main()
    except Exception as exc:
        emit('error', message=str(exc))
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
