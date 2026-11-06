import './style.css';
import bundledCatalog from '../catalog/models.json';
import pkg from '../package.json';
import {
  createIcons,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CloudDownload,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Feather,
  FolderOpen,
  Gauge,
  HardDrive,
  Image,
  Images,
  Info,
  Languages,
  Lightbulb,
  Loader,
  Maximize2,
  Moon,
  Palette,
  Play,
  Power,
  PowerOff,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Trash2,
  WandSparkles,
  X,
} from 'lucide';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openPath, openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';

/** Only the icons this interface uses are bundled; createIcons matches them by PascalCase name. */
const ICONS = {
  ArrowRight,
  ArrowUpRight,
  Ban,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CloudDownload,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Feather,
  FolderOpen,
  Gauge,
  HardDrive,
  Image,
  Images,
  Info,
  Languages,
  Lightbulb,
  Loader,
  Maximize2,
  Moon,
  Palette,
  Play,
  Power,
  PowerOff,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Trash2,
  WandSparkles,
  X,
};

const VERSION = pkg.version;
const isTauri = !!window.__TAURI_INTERNALS__;
const $ = (selector) => document.querySelector(selector);

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
};

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const icon = (name, size = 18) => `<i data-lucide="${name}" class="ico" style="width:${size}px;height:${size}px"></i>`;

const joinPath = (dir, name) => {
  const base = String(dir || '').replace(/[\\/]+$/, '');
  const sep = base.includes('\\') ? '\\' : '/';
  return `${base}${sep}${name}`;
};

const folderName = (id) => String(id).replace(/[^a-zA-Z0-9._-]/g, '--');

const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (!value) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const size = value / 1024 ** i;
  return `${size >= 100 || i < 2 ? Math.round(size) : size.toFixed(1)} ${units[i]}`;
};

const formatDuration = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const faNum = (value) => (state.lang === 'fa' ? Number(value || 0).toLocaleString('fa-IR') : Number(value || 0).toLocaleString('en-US'));
const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ *
 * Translations — the English sentence is the key
 * ------------------------------------------------------------------ */

const FA = {
  Studio: 'استودیو',
  Gallery: 'گالری',
  Models: 'مدل‌ها',
  Settings: 'تنظیمات',
  Workspace: 'فضای کار',
  'Create something wonderful': 'چیزی شگفت‌انگیز خلق کن',
  'Your imagination, made visible.': 'خیالت را به تصویر بکش.',
  Compose: 'ساخت تصویر',
  'A clear idea is half the artwork.': 'ایده‌ی روشن، نیمی از اثر هنری است.',
  'The idea': 'ایده',
  Prompt: 'پرامپت',
  'Describe what you want to create…': 'آنچه می‌خواهی بسازی را توصیف کن…',
  'Negative prompt': 'پرامپت منفی',
  'What should be left out?': 'چه چیزی در تصویر نباشد؟',
  'Quick start': 'شروع سریع',
  'Image settings': 'تنظیمات تصویر',
  'Advanced settings': 'تنظیمات پیشرفته',
  Model: 'مدل',
  Size: 'اندازه',
  Images: 'تعداد تصاویر',
  Steps: 'مراحل',
  Guidance: 'هدایت',
  Seed: 'بذر تصادفی',
  Random: 'تصادفی',
  'Generate image': 'ساخت تصویر',
  'Working…': 'در حال کار…',
  Canvas: 'بوم',
  'Your canvas awaits': 'بوم تو منتظر است',
  'Write a prompt and press generate — your image appears right here.': 'یک پرامپت بنویس و دکمه‌ی ساخت را بزن؛ تصویر همین‌جا ظاهر می‌شود.',
  'Creating your image': 'تصویر تو در حال خلق شدن است',
  'Local model is painting with light…': 'مدل محلی با نور نقاشی می‌کند…',
  'Start over': 'شروع دوباره',
  'Save as…': 'ذخیره به‌صورت…',
  'Open folder': 'پوشه‌ی تصویر',
  'View large': 'نمایش بزرگ',
  'Recent creations': 'آخرین آثار',
  'Your imagination, collected.': 'خیال تو، جمع‌آوری‌شده.',
  'View all': 'مشاهده همه',
  'No creations yet': 'هنوز تصویری ساخته نشده',
  'Start creating': 'شروع ساخت',
  'A little inspiration': 'کمی الهام',
  'Try adding a mood, art style, or lighting to your prompt.': 'حال‌وهوا، سبک هنری یا نورپردازی را به پرامپت اضافه کن.',
  'Surprise me': 'غافلگیرم کن',
  'All creations': 'همه‌ی آثار',
  'A little gallery of your big ideas.': 'گالری کوچکی از ایده‌های بزرگ تو.',
  'Model library': 'کتابخانه‌ی مدل‌ها',
  'Model catalogue': 'فهرست مدل‌ها',
  'Refresh catalogue': 'به‌روزرسانی فهرست',
  'Custom Hugging Face model': 'مدل دلخواه Hugging Face',
  'Enter a Diffusers-compatible repository id. Gated models need approval and an HF_TOKEN environment variable.': 'شناسه‌ی یک مخزن سازگار با Diffusers را وارد کن. مدل‌های محدود به تأیید لایسنس و متغیر محیطی HF_TOKEN نیاز دارند.',
  'Download model': 'دانلود مدل',
  Downloaded: 'دانلود شده',
  Downloading: 'در حال دانلود',
  'Use model': 'انتخاب مدل',
  Selected: 'انتخاب شده',
  Use: 'استفاده',
  'Ready to create': 'آماده‌ی ساخت',
  'Storage & folders': 'فضای ذخیره‌سازی و پوشه‌ها',
  'Model download folder': 'پوشه‌ی دانلود مدل‌ها',
  'Image output folder': 'پوشه‌ی خروجی تصاویر',
  'Choose folder': 'انتخاب پوشه',
  'Compute device': 'پردازنده',
  'Auto detect': 'تشخیص خودکار',
  'Re-check': 'بررسی دوباره',
  Appearance: 'ظاهر',
  Theme: 'پوسته',
  Dark: 'تیره',
  Light: 'روشن',
  Language: 'زبان',
  'About & updates': 'درباره و به‌روزرسانی',
  'Check for updates': 'بررسی به‌روزرسانی',
  'Python worker': 'سرویس پایتون',
  'Copy command': 'کپی فرمان',
  'Translate prompt': 'ترجمه‌ی پرامپت',
  'Folder selection is available in the desktop app.': 'انتخاب پوشه فقط در نسخه‌ی دسکتاپ ممکن است.',
  'This action runs in the desktop app.': 'این کار فقط در نسخه‌ی دسکتاپ اجرا می‌شود.',
  'Model downloads run in the desktop app.': 'دانلود مدل فقط در نسخه‌ی دسکتاپ انجام می‌شود.',
  'Please wait for the current task to finish.': 'لطفاً تا پایان کار جاری صبر کن.',
  'Enter a model id like username/model-name.': 'شناسه‌ی مدل را مثل username/model-name وارد کن.',
  'Choose a model folder in Settings first.': 'اول در تنظیمات یک پوشه برای مدل‌ها انتخاب کن.',
  'Connecting to Hugging Face…': 'در حال اتصال به Hugging Face…',
  'Model downloaded and ready': 'مدل دانلود شد و آماده است',
  'Model ready to use': 'مدل آماده‌ی استفاده است',
  'Download failed': 'دانلود ناموفق بود',
  'Download complete': 'دانلود کامل شد',
  'Write a prompt first.': 'اول یک پرامپت بنویس.',
  'Download the selected model first.': 'اول مدل انتخاب‌شده را دانلود کن.',
  'Starting generation…': 'شروع ساخت…',
  'Generation complete': 'ساخت کامل شد',
  'Generation failed': 'ساخت تصویر ناموفق بود',
  'Image saved': 'تصویر ذخیره شد',
  'Could not save the image.': 'ذخیره‌ی تصویر انجام نشد.',
  'Image download started.': 'دانلود تصویر شروع شد.',
  'Prompt copied': 'پرامپت کپی شد',
  'Command copied': 'فرمان کپی شد',
  'Could not copy.': 'کپی انجام نشد.',
  'Catalog updated from GitHub.': 'فهرست از گیت‌هاب به‌روز شد.',
  'Bundled catalogue · offline mode': 'فهرست همراه برنامه · حالت آفلاین',
  'Loading model catalogue…': 'در حال بارگذاری فهرست مدل‌ها…',
  'You are up to date.': 'برنامه به‌روز است.',
  'Could not check releases.': 'بررسی نسخه‌ها ممکن نشد.',
  'Detecting hardware…': 'در حال شناسایی سخت‌افزار…',
  'CPU detected': 'پردازنده‌ی مرکزی شناسایی شد',
  'Apple GPU detected': 'پردازنده‌ی گرافیکی اپل شناسایی شد',
  'Browser preview': 'پیش‌نمایش مرورگر',
  'Models download from Hugging Face straight to your computer.': 'مدل‌ها مستقیم از Hugging Face روی کامپیوتر تو دانلود می‌شوند.',
  'Images are saved automatically to your output folder.': 'تصاویر به‌طور خودکار در پوشه‌ی خروجی ذخیره می‌شوند.',
  'Local & private': 'محلی و خصوصی',
  'Prompts and images never leave your machine.': 'پرامپت‌ها و تصاویر از دستگاه تو خارج نمی‌شوند.',
  'Browser preview — model downloads and generation need the desktop app.': 'پیش‌نمایش مرورگر — دانلود مدل و ساخت تصویر به نسخه‌ی دسکتاپ نیاز دارد.',
  'Behind the scenes': 'پشت صحنه',
  'No model selected': 'مدلی انتخاب نشده',
  'Current image': 'تصویر جاری',
  Bundled: 'همراه برنامه',
  'Approx. size': 'حجم تقریبی',
  installed: 'نصب‌شده',
  images: 'تصویر',
  files: 'فایل',
  steps: 'مرحله',
  Back: 'بازگشت',
  Close: 'بستن',
  Next: 'بعدی',
  Previous: 'قبلی',
  'Save image': 'ذخیره‌ی تصویر',
  'Copy prompt': 'کپی پرامپت',
  'Open in Hugging Face': 'باز کردن در Hugging Face',
  Custom: 'دلخواه',
  Recommended: 'پیشنهادی',
  Fast: 'سریع',
  Detailed: 'پرجزئیات',
  Classic: 'کلاسیک',
  'Enter a model id first.': 'اول شناسه‌ی مدل را وارد کن.',
  'Model settings': 'تنظیمات مدل',
  Quality: 'کیفیت',
  Hardware: 'سخت‌افزار',
  'Where your files live': 'محل نگهداری فایل‌ها',
  'Switch look and language.': 'ظاهر و زبان را تغییر بده.',
  'Runs inference locally with Python and Diffusers.': 'استنتاج را به‌صورت محلی با پایتون و Diffusers اجرا می‌کند.',
  'Install the worker dependencies once:': 'یک‌بار وابستگی‌های سرویس را نصب کن:',
  Version: 'نسخه',
  Refresh: 'تازه‌سازی',
  'Show in folder': 'نمایش در پوشه',
  'Installed models': 'مدل‌های نصب‌شده',
  'Download models': 'دانلود مدل',
  'No models yet': 'هنوز مدلی نداری',
  'Download a model to start creating.': 'برای شروع، یک مدل دانلود کن.',
  Loaded: 'بارگذاری‌شده',
  Load: 'بارگذاری',
  Unload: 'خروج از حافظه',
  'Load model': 'بارگذاری مدل',
  'Unload model': 'خروج مدل از حافظه',
  'Model loaded': 'مدل بارگذاری شد',
  'Model unloaded': 'مدل از حافظه خارج شد',
  'Loading model…': 'در حال بارگذاری مدل…',
  'Loads automatically': 'به‌صورت خودکار بارگذاری می‌شود',
  Ready: 'آماده',
  'Not ready': 'ناقص',
  Delete: 'حذف',
  'Delete model?': 'مدل حذف شود؟',
  'This deletes the downloaded files from disk.': 'فایل‌های دانلودشده از دیسک پاک می‌شوند.',
  'Model deleted': 'مدل حذف شد',
  Cancel: 'لغو',
  Stop: 'توقف',
  'Cancelling…': 'در حال توقف…',
  'Cancelled': 'لغو شد',
  Worker: 'سرویس',
  'Restart worker': 'راه‌اندازی دوباره‌ی سرویس',
  'Environment check': 'بررسی محیط',
  'Run check': 'اجرای بررسی',
  'Free space': 'فضای آزاد',
  'Total size': 'حجم کل',
  'The Python worker did not answer.': 'سرویس پایتون پاسخ نداد.',
  'Worker stopped unexpectedly.': 'سرویس به‌طور غیرمنتظره متوقف شد.',
  'Download folder': 'پوشه‌ی دانلود',
  'Model manager': 'مدیریت مدل‌ها',
  'Manage what is on disk, then load one to generate.': 'مدل‌های روی دیسک را مدیریت کن و برای ساخت، یکی را بارگذاری کن.',
  'No models on disk yet': 'هنوز مدلی روی دیسک نیست',
  'Progress': 'پیشرفت',
  'Waiting for the worker…': 'در انتظار سرویس…',
  'Starting the Python worker…': 'در حال راه‌اندازی سرویس پایتون…',
  'Device': 'دستگاه',
  'Reload to apply the new device.': 'برای اعمال دستگاه جدید، مدل را دوباره بارگذاری کن.',
  'Model files are missing.': 'فایل‌های مدل ناقص است.',
  'Delete files': 'حذف فایل‌ها',
  'Generate with this model': 'ساخت با این مدل',
  'Storage': 'فضای ذخیره‌سازی',
  'Loaded model': 'مدل بارگذاری‌شده',
  'No model is loaded. Generation loads one automatically.': 'هیچ مدلی بارگذاری نشده؛ هنگام ساخت به‌صورت خودکار بارگذاری می‌شود.',
  'System': 'سیستم',
  'Optional': 'اختیاری',
  'Python': 'پایتون',
  'PyTorch': 'PyTorch',
  'Network': 'شبکه',
};

const t = (phrase) => (state.lang === 'fa' ? FA[phrase] || phrase : phrase);

const SAMPLES = [
  {
    en: 'A lone wooden cabin beside a misty lake at golden hour, cinematic light, ultra detailed',
    fa: 'کلبه‌ای چوبی کنار دریاچه‌ای مه‌آلود در نور طلایی، نورپردازی سینمایی، فوق‌العاده پرجزئیات',
  },
  {
    en: 'Portrait of an astronaut surrounded by glowing flowers, soft studio light, 85mm lens',
    fa: 'پرتره‌ی فضانوردی میان گل‌های درخشان، نور نرم استودیویی، لنز ۸۵ میلی‌متر',
  },
  {
    en: 'A floating city above the clouds at neon dusk, dreamy atmosphere, digital painting',
    fa: 'شهری معلق بالای ابرها در غروب نئونی، فضای رؤیایی، نقاشی دیجیتال',
  },
  {
    en: 'Surreal desert with giant glass arches, pastel sunset, minimal composition',
    fa: 'بیابان سورئال با طاق‌های شیشه‌ای غول‌پیکر، غروب پاستلی، ترکیب مینیمال',
  },
];

const PAGES = [
  { id: 'studio', icon: 'sparkles', label: 'Studio', group: 'workspace' },
  { id: 'gallery', icon: 'images', label: 'Gallery', group: 'workspace' },
  { id: 'models', icon: 'boxes', label: 'Models', group: 'workspace' },
  { id: 'settings', icon: 'settings-2', label: 'Settings', group: 'general' },
];

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

const state = {
  page: 'studio',
  lang: read('dc.lang', 'fa'),
  theme: read('dc.theme', 'dark'),
  prompt: '',
  negative: '',
  model: read('dc.model', 'Lykon/dreamshaper-8'),
  width: 512,
  height: 512,
  count: 1,
  steps: 30,
  guidance: 7.5,
  seed: -1,
  advanced: false,
  device: read('dc.device', 'auto'),
  modelsDir: read('dc.modelsDir', ''),
  output: read('dc.output', ''),
  hardware: 'Detecting hardware…',
  models: [],
  catalog: bundledCatalog,
  catalogStatus: '',
  images: [],
  meta: read('dc.meta', {}),
  workerReady: false,
  workerStarting: false,
  workerInfo: null,
  workerError: '',
  pythonError: '',
  loaded: null,
  task: null,
  progress: 0,
  status: '',
  startedAt: 0,
  elapsed: 0,
  diagnostics: null,
  update: '',
  lightbox: -1,
  pendingUnload: null,
  confirmResolve: null,
};

const installedIds = () => new Set(state.models.map((model) => model.id));
const isInstalled = (id) => installedIds().has(id);
const modelById = (id) => state.models.find((model) => model.id === id);
const modelPath = (id) => joinPath(state.modelsDir, folderName(id));
const jobKind = () => state.task?.kind || null;

/* ------------------------------------------------------------------ *
 * Toasts, dialogs, lightbox
 * ------------------------------------------------------------------ */

function showToast(message, kind = 'ok') {
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.className = 'toasts';
    document.body.appendChild(host);
  }
  const glyph = kind === 'ok' ? 'circle-check' : kind === 'err' ? 'circle-alert' : 'info';
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `<span class="toast-icon">${icon(glyph, 16)}</span><span class="toast-text">${esc(message)}</span>`;
  host.appendChild(el);
  createIcons({ icons: ICONS });
  requestAnimationFrame(() => el.classList.add('toast-in'));
  setTimeout(() => {
    el.classList.remove('toast-in');
    setTimeout(() => el.remove(), 320);
  }, 4600);
}

function confirmDialog({ title, body, confirmLabel }) {
  return new Promise((resolve) => {
    closeDialog();
    const el = document.createElement('div');
    el.id = 'confirm';
    el.className = 'modal';
    el.innerHTML = `
      <div class="modal-backdrop" data-confirm="no"></div>
      <div class="modal-panel" role="dialog" aria-modal="true">
        <span class="modal-icon">${icon('circle-alert', 20)}</span>
        <h3>${esc(title)}</h3>
        <p>${esc(body)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-confirm="no">${t('Cancel')}</button>
          <button class="btn btn-danger" data-confirm="yes">${esc(confirmLabel || t('Delete'))}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    createIcons({ icons: ICONS });
    state.confirmResolve = resolve;
    el.addEventListener('click', (event) => {
      const answer = event.target.closest('[data-confirm]')?.dataset.confirm;
      if (!answer) return;
      resolve(answer === 'yes');
      state.confirmResolve = null;
      el.remove();
    });
    requestAnimationFrame(() => el.classList.add('open'));
  });
}

function closeDialog() {
  if (state.confirmResolve) {
    state.confirmResolve(false);
    state.confirmResolve = null;
  }
  document.getElementById('confirm')?.remove();
}

function closeLightbox() {
  document.getElementById('lightbox')?.remove();
  state.lightbox = -1;
  document.body.classList.remove('no-scroll');
}

function openLightbox(index) {
  const image = state.images[index];
  if (!image) return;
  closeLightbox();
  const meta = state.meta[image.name] || {};
  const el = document.createElement('div');
  el.id = 'lightbox';
  el.className = 'lightbox';
  el.innerHTML = `
    <div class="lightbox-backdrop" data-lb="close"></div>
    <div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="${esc(t('Current image'))}">
      <button class="lightbox-close" data-lb="close" aria-label="${esc(t('Close'))}">${icon('x', 18)}</button>
      ${state.images.length > 1 ? `<button class="lightbox-nav prev" data-lb="prev" aria-label="${esc(t('Previous'))}">${icon('chevron-right', 20)}</button>` : ''}
      <img class="lightbox-image" src="${image.url}" alt="${esc(meta.prompt || image.name)}" />
      ${state.images.length > 1 ? `<button class="lightbox-nav next" data-lb="next" aria-label="${esc(t('Next'))}">${icon('chevron-left', 20)}</button>` : ''}
      <div class="lightbox-info">
        <div class="lightbox-text">
          <strong>${esc(meta.prompt || image.name)}</strong>
          <span>${esc(meta.model || state.model)} · ${meta.seed !== undefined ? `${t('Seed')} ${esc(meta.seed)}` : esc(image.name)}</span>
        </div>
        <div class="lightbox-actions">
          <button class="btn btn-ghost" data-lb="save">${icon('download', 15)} ${t('Save image')}</button>
          ${isTauri ? `<button class="btn btn-ghost" data-lb="reveal">${icon('folder-open', 15)} ${t('Show in folder')}</button>` : ''}
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  createIcons({ icons: ICONS });
  state.lightbox = index;
  el.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-lb]')?.dataset.lb;
    if (!action) return;
    if (action === 'close') closeLightbox();
    if (action === 'prev') stepLightbox(1);
    if (action === 'next') stepLightbox(-1);
    if (action === 'save') await saveImage(state.images[state.lightbox]);
    if (action === 'reveal') await revealImage(state.images[state.lightbox]);
  });
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => el.classList.add('open'));
}

function stepLightbox(direction) {
  const next = (state.lightbox ?? 0) + direction;
  if (next < 0 || next >= state.images.length) return;
  openLightbox(next);
}

/* ------------------------------------------------------------------ *
 * Worker bridge
 * ------------------------------------------------------------------ */

async function startWorker({ quiet = false } = {}) {
  if (!isTauri) return false;
  state.workerStarting = true;
  state.workerError = '';
  if (!quiet) render();
  try {
    await invoke('worker_start');
  } catch (error) {
    state.workerError = String(error || '');
    state.pythonError = state.workerError;
    state.workerStarting = false;
    state.workerReady = false;
    showToast(state.workerError, 'err');
    render();
    return false;
  }
  const deadline = Date.now() + 12000;
  while (!state.workerReady && Date.now() < deadline) await sleep(120);
  state.workerStarting = false;
  if (!state.workerReady) {
    state.workerError = t('The Python worker did not answer.');
    state.pythonError = state.workerError;
    showToast(state.workerError, 'err');
    render();
    return false;
  }
  render();
  return true;
}

async function sendWorker(action, args = {}) {
  if (!isTauri) {
    showToast(t('This action runs in the desktop app.'), 'warn');
    return false;
  }
  if (!state.workerReady) {
    const ok = await startWorker({ quiet: true });
    if (!ok) return false;
  }
  try {
    await invoke('worker_send', { action, args });
    return true;
  } catch (error) {
    state.pythonError = String(error || '');
    showToast(state.pythonError, 'err');
    render();
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

const iconBtn = (action, glyph, label, extra = '') =>
  `<button class="icon-btn ${extra}" data-action="${action}" title="${esc(label)}" aria-label="${esc(label)}">${icon(glyph, 16)}</button>`;

function statusLabel() {
  return state.status || (state.workerReady ? t('Ready to create') : t('Waiting for the worker…'));
}

function sidebar() {
  const groups = [
    { key: 'workspace', label: 'Workspace' },
    { key: 'general', label: 'General' },
  ];
  return `
  <aside class="sidebar">
    <div class="brand">
      <span class="brand-mark">${icon('sparkles', 19)}</span>
      <span class="brand-text"><strong>dreamcanvas</strong><small>AI STUDIO</small></span>
    </div>
    <div class="side-scroll">
      ${groups
        .map(
          (group) => `
        <p class="side-label">${esc(t(group.label))}</p>
        <nav class="side-nav">
          ${PAGES.filter((page) => page.group === group.key)
            .map((page) => {
              const badge = page.id === 'gallery' ? state.images.length : page.id === 'models' ? state.models.length : 0;
              return `<button class="nav ${state.page === page.id ? 'active' : ''}" data-page="${page.id}">
                <span class="nav-icon">${icon(page.icon, 18)}</span>
                <span class="nav-label">${esc(t(page.label))}</span>
                ${badge ? `<span class="nav-badge">${faNum(badge)}</span>` : ''}
              </button>`;
            })
            .join('')}
        </nav>`
        )
        .join('')}
      <div class="side-card">
        <span class="side-card-icon">${icon('shield-check', 17)}</span>
        <strong>${t('Local & private')}</strong>
        <p>${t('Prompts and images never leave your machine.')}</p>
      </div>
    </div>
    <div class="side-footer">
      <span class="avatar">D</span>
      <span class="side-user"><strong>DreamCanvas</strong><small>v${esc(VERSION)}</small></span>
      <span class="side-online ${state.workerReady ? '' : 'off'}" title="${esc(statusLabel())}"><i></i></span>
    </div>
  </aside>`;
}

function topbar() {
  return `
  <header class="topbar">
    <div class="crumbs">
      <span>${esc(t('Workspace'))}</span>
      <i class="crumb-sep">/</i>
      <b>${esc(t(PAGES.find((page) => page.id === state.page)?.label || 'Studio'))}</b>
    </div>
    <div class="top-actions">
      ${
        state.task
          ? `<span class="job-pill"><i class="spin-dot"></i>${esc(taskLabel())}<b>${Math.round(state.progress)}%</b></span>`
          : ''
      }
      ${state.loaded ? `<span class="loaded-pill" title="${esc(state.loaded.model)}">${icon('power', 13)}<span>${esc(state.loaded.model.split('/').pop())}</span></span>` : ''}
      <span class="hardware-pill" title="${esc(t('Hardware'))}">${icon('cpu', 14)}<span>${esc(state.hardware)}</span></span>
      <button class="icon-btn" data-action="translate" title="${esc(t('Translate prompt'))}" aria-label="${esc(t('Translate prompt'))}">${icon('languages', 17)}</button>
      <button class="icon-btn" data-action="theme" title="${esc(t('Theme'))}" aria-label="${esc(t('Theme'))}">${icon(state.theme === 'dark' ? 'sun' : 'moon', 17)}</button>
      <button class="lang-btn" data-action="lang" title="${esc(t('Language'))}">${state.lang === 'fa' ? 'EN' : 'FA'}</button>
    </div>
  </header>`;
}

function statsStrip() {
  const totalSize = state.models.reduce((sum, model) => sum + (Number(model.size) || 0), 0);
  return `
    <div class="stats">
      <div class="stat"><span>${icon('images', 14)}</span><strong>${faNum(state.images.length)}</strong><small>${t('images')}</small></div>
      <div class="stat"><span>${icon('boxes', 14)}</span><strong>${faNum(state.models.length)}</strong><small>${t('Models')}</small></div>
      <div class="stat"><span>${icon('hard-drive', 14)}</span><strong>${formatBytes(totalSize)}</strong><small>${t('Total size')}</small></div>
    </div>`;
}

function taskLabel() {
  if (!state.task) return '';
  if (state.task.kind === 'download') return t('Downloading');
  if (state.task.kind === 'load') return t('Loading model…');
  return t('Working…');
}

function modelSelectOptions() {
  if (!state.models.length) return `<option value="">${t('No models yet')}</option>`;
  return state.models
    .map((model) => `<option value="${esc(model.id)}"${model.id === state.model ? ' selected' : ''}>${esc(model.id)}${state.loaded?.model === model.id ? ` — ${t('Loaded')}` : ''}</option>`)
    .join('');
}

function studio() {
  const current = modelById(state.model);
  const loadedHere = state.loaded && state.loaded.model === state.model;
  const busy = !!state.task;
  const generating = state.task?.kind === 'generate';
  const loading = state.task?.kind === 'load' || (generating && state.task?.phase === 'load');
  const latest = state.images[0];
  const latestMeta = latest ? state.meta[latest.name] || {} : {};

  return `
  <div class="page">
    <section class="page-head">
      <div>
        <p class="eyebrow">${icon('sparkles', 13)} ${t('Your imagination, made visible.')}</p>
        <h1>${t('Create something wonderful')}</h1>
        <p class="page-sub">${t('A clear idea is half the artwork.')}</p>
      </div>
      ${statsStrip()}
    </section>

    <div class="studio-grid">
      <section class="card composer">
        <div class="card-head">
          <span class="card-icon">${icon('wand-sparkles', 18)}</span>
          <div class="card-titles"><h2>${t('Compose')}</h2><p>${t('Your imagination, made visible.')}</p></div>
          <span class="tag">${icon('shield-check', 12)} ${t('Local & private')}</span>
        </div>

        <div class="field">
          <div class="field-head">
            <label for="prompt">${icon('feather', 14)} ${t('The idea')}</label>
            <span class="counter" id="promptCount">${faNum(state.prompt.length)} / 800</span>
          </div>
          <div class="prompt-shell">
            <textarea id="prompt" maxlength="800" spellcheck="false" placeholder="${esc(t('Describe what you want to create…'))}">${esc(state.prompt)}</textarea>
            <div class="prompt-tools">
              <span class="hint">${icon('lightbulb', 13)} ${t('Try adding a mood, art style, or lighting to your prompt.')}</span>
              <button class="link-btn" data-action="translate">${icon('languages', 13)} ${t('Translate prompt')}</button>
            </div>
          </div>
        </div>

        <div class="samples">
          <span class="samples-label">${t('Quick start')}</span>
          ${SAMPLES.map((sample, i) => {
            const label = state.lang === 'fa' ? sample.fa : sample.en;
            return `<button class="chip" data-action="sample:${i}" title="${esc(label)}">${esc(label.length > 34 ? `${label.slice(0, 34)}…` : label)}</button>`;
          }).join('')}
        </div>

        <div class="field compact">
          <div class="field-head"><label for="negative">${icon('ban', 14)} ${t('Negative prompt')}</label><span class="counter">${t('Optional')}</span></div>
          <input id="negative" value="${esc(state.negative)}" placeholder="${esc(t('What should be left out?'))}" />
        </div>

        <div class="divider"></div>

        <div class="section-title">
          <h3>${icon('sliders-horizontal', 15)} ${t('Image settings')}</h3>
          <span>${t('Quality')}</span>
        </div>

        <div class="field">
          <label for="model">${t('Model')}</label>
          ${
            state.models.length
              ? `<div class="model-row">
                  <div class="select-shell"><select id="model">${modelSelectOptions()}</select>${icon('chevron-down', 14)}</div>
                  ${
                    loadedHere
                      ? `<button class="btn btn-ghost" data-action="unload-model">${icon('power-off', 14)} ${t('Unload')}</button>`
                      : `<button class="btn btn-ghost" data-action="load-model:${esc(state.model)}" ${busy ? 'disabled' : ''}>${icon('power', 14)} ${t('Load')}</button>`
                  }
                </div>`
              : `<button class="btn btn-primary" data-page="models">${icon('cloud-download', 15)} ${t('Download a model to start creating.')}</button>`
          }
          <div class="model-state">
            ${
              loadedHere
                ? `<span class="state-chip ok">${icon('check', 12)} ${t('Loaded')} · ${esc(String(state.loaded.device).toUpperCase())}${state.loaded.dtype ? ` · ${esc(state.loaded.dtype)}` : ''}</span>`
                : current
                  ? `<span class="state-chip">${icon('power', 12)} ${t('Loads automatically')}</span>`
                  : `<span class="state-chip warn">${icon('circle-alert', 12)} ${t('No models yet')}</span>`
            }
            ${state.workerReady ? '' : `<span class="state-chip warn">${icon('loader', 12)} ${t('Waiting for the worker…')}</span>`}
          </div>
        </div>

        <div class="field-grid three">
          <div class="field">
            <label for="size">${t('Size')}</label>
            <div class="select-shell"><select id="size">
              ${[
                ['512x512', '1:1 · 512'],
                ['512x768', '2:3 · 512×768'],
                ['768x512', '3:2 · 768×512'],
                ['768x768', '1:1 · 768'],
              ]
                .map(([value, label]) => `<option value="${value}"${value === `${state.width}x${state.height}` ? ' selected' : ''}>${label}</option>`)
                .join('')}
            </select>${icon('chevron-down', 14)}</div>
          </div>
          <div class="field narrow">
            <label for="count">${t('Images')}</label>
            <input id="count" type="number" min="1" max="50" value="${state.count}" />
          </div>
          <div class="field narrow">
            <label for="seed">${t('Seed')}</label>
            <input id="seed" type="number" min="-1" value="${state.seed}" />
          </div>
        </div>

        <button class="advanced-toggle ${state.advanced ? 'open' : ''}" data-action="advanced">
          ${icon('settings-2', 14)} ${t('Advanced settings')} ${icon(state.advanced ? 'chevron-up' : 'chevron-down', 14)}
        </button>
        ${
          state.advanced
            ? `<div class="field-grid advanced">
                <div class="field narrow">
                  <label for="steps">${t('Steps')}</label>
                  <input id="steps" type="number" min="1" max="150" value="${state.steps}" />
                </div>
                <div class="field narrow">
                  <label for="guidance">${t('Guidance')}</label>
                  <input id="guidance" type="number" min="0" max="30" step="0.5" value="${state.guidance}" />
                </div>
                <p class="advanced-note">${icon('info', 13)} ${t('Seed')} −1 = ${t('Random')}</p>
              </div>`
            : ''
        }

        <div class="generate-row">
          <button class="generate ${generating ? 'is-busy' : ''}" data-action="generate" ${busy ? 'disabled' : ''}>
            <span class="generate-glow"></span>
            ${generating ? `<i class="spinner"></i> ${t('Working…')}` : `${icon('sparkles', 18)} ${t('Generate image')}`}
            <span class="generate-key">⌘↵</span>
          </button>
          ${busy ? `<button class="stop-btn" data-action="cancel">${icon('square', 15)} ${t('Stop')}</button>` : ''}
        </div>

        <div class="job-line" aria-live="polite">
          <span class="dot ${state.task ? 'busy' : ''}"></span>
          <span class="job-text" data-live-status>${esc(statusLabel())}</span>
          ${state.task ? `<span class="job-meta"><b data-live-percent>${Math.round(state.progress)}%</b><span data-live-elapsed>${formatDuration(state.elapsed)}</span></span>` : ''}
        </div>
        ${
          state.task
            ? `<div class="progress"><span data-live-progress style="width:${Math.min(100, Math.max(0, state.progress))}%"></span></div>
               <p class="job-detail" data-live-detail>${esc(taskDetail())}</p>`
            : ''
        }
        ${pythonAlert()}
      </section>

      <section class="preview-stack">
        <div class="card canvas-card">
          <div class="card-head compact">
            <span class="card-icon">${icon('image', 18)}</span>
            <div class="card-titles"><h2>${t('Canvas')}</h2><p>${esc(latest ? latest.name : t('Your canvas awaits'))}</p></div>
            <div class="head-actions">
              ${latest ? iconBtn('view-large:0', 'maximize-2', t('View large')) : ''}
              ${latest ? iconBtn('open-output', 'folder-open', t('Open folder')) : ''}
            </div>
          </div>

          <div class="canvas ${busy ? 'busy' : ''} ${latest && !busy ? 'filled' : ''}">
            ${
              busy
                ? `<div class="creating">
                    <div class="orb ${loading ? 'loading' : ''}"><span class="halo"></span><span class="halo"></span><span class="halo"></span>${icon(loading ? 'loader' : 'sparkles', 26)}</div>
                    <h3>${loading ? t('Loading model…') : t('Creating your image')}</h3>
                    <p>${loading ? esc(state.status || t('Starting the Python worker…')) : t('Local model is painting with light…')}</p>
                    <div class="creating-meta"><span data-live-status2>${esc(statusLabel())}</span><b data-live-percent2>${Math.round(state.progress)}%</b></div>
                    <div class="progress slim"><span data-live-progress2 style="width:${Math.min(100, Math.max(0, state.progress))}%"></span></div>
                    <button class="link-btn" data-action="cancel">${icon('square', 12)} ${t('Stop')}</button>
                  </div>`
                : latest
                  ? `<img class="canvas-image" src="${latest.url}" alt="${esc(latestMeta.prompt || latest.name)}" />
                     <div class="canvas-overlay">
                       <span class="pill">${icon('check', 12)} ${esc(latestMeta.model || state.model)}</span>
                       <span class="pill ghost">${latestMeta.seed !== undefined ? `${t('Seed')} ${esc(latestMeta.seed)}` : esc(latest.name)}</span>
                     </div>`
                  : `<div class="empty-canvas">
                      <div class="empty-art">
                        <span class="ring ring-a"></span><span class="ring ring-b"></span><span class="ring ring-c"></span>
                        <span class="empty-core">${icon('image', 30)}</span>
                        <span class="spark s1">✦</span><span class="spark s2">✧</span><span class="spark s3">✦</span>
                      </div>
                      <h3>${t('Your canvas awaits')}</h3>
                      <p>${t('Write a prompt and press generate — your image appears right here.')}</p>
                      <button class="chip accent" data-action="surprise">${icon('sparkles', 13)} ${t('Surprise me')}</button>
                    </div>`
            }
            ${
              state.task?.kind === 'download'
                ? `<div class="download-badge">${icon('cloud-download', 15)}<span>${esc(state.task?.model || '')}</span><b data-live-percent3>${Math.round(state.progress)}%</b></div>`
                : ''
            }
          </div>

          ${
            latest
              ? `<div class="canvas-actions">
                  <div class="canvas-meta">
                    <strong>${esc(latestMeta.model || state.model)}</strong>
                    <span>${esc((latestMeta.prompt || latest.name).slice(0, 70))}${(latestMeta.prompt || '').length > 70 ? '…' : ''}</span>
                  </div>
                  <div class="action-row">
                    <button class="btn btn-primary" data-action="save-image:0">${icon('download', 15)} ${t('Save as…')}</button>
                    <button class="icon-btn" data-action="copy-prompt" title="${esc(t('Copy prompt'))}">${icon('copy', 16)}</button>
                  </div>
                </div>`
              : `<div class="canvas-foot"><span>${icon('hard-drive', 13)} ${t('Images are saved automatically to your output folder.')}</span></div>`
          }
        </div>

        <div class="card tips-card">
          <span class="tips-icon">${icon('lightbulb', 17)}</span>
          <div>
            <strong>${t('A little inspiration')}</strong>
            <p>${t('Try adding a mood, art style, or lighting to your prompt.')}</p>
          </div>
          <button class="chip" data-action="surprise">${t('Surprise me')} ${icon('arrow-up-right', 12)}</button>
          <span class="tips-glow"></span>
        </div>
      </section>
    </div>

    ${recentStrip()}
  </div>`;
}

function pythonAlert() {
  if (!state.pythonError) return '';
  return `<div class="alert">${icon('circle-alert', 15)}<div><strong>${t('Python worker')}</strong><p>${esc(state.pythonError)}</p>
    <div class="alert-actions">
      <button class="link-btn" data-action="restart-worker">${icon('refresh-cw', 13)} ${t('Restart worker')}</button>
      <button class="link-btn" data-action="copy-command">${icon('copy', 13)} ${t('Copy command')}</button>
    </div></div></div>`;
}

function recentStrip() {
  const recent = state.images.slice(0, 5);
  return `
  <section class="card recent">
    <div class="card-head compact">
      <span class="card-icon">${icon('images', 17)}</span>
      <div class="card-titles"><h2>${t('Recent creations')}</h2><p>${t('Your imagination, collected.')}</p></div>
      <button class="link-btn" data-page="gallery">${t('View all')} ${icon('arrow-right', 13)}</button>
    </div>
    ${
      recent.length
        ? `<div class="recent-strip">${recent
            .map(
              (image, i) => `<button class="thumb" data-action="lightbox:${i}" title="${esc(state.meta[image.name]?.prompt || image.name)}">
                <img src="${image.url}" alt="${esc(image.name)}" loading="lazy" />
                <span class="thumb-veil">${icon('maximize-2', 15)}</span>
              </button>`
            )
            .join('')}</div>`
        : `<div class="empty-strip">${icon('image', 18)}<span>${t('No creations yet')}</span><button class="link-btn" data-page="studio">${t('Start creating')} ${icon('arrow-up-right', 12)}</button></div>`
    }
  </section>`;
}

function gallery() {
  return `
  <div class="page">
    <section class="page-head">
      <div>
        <p class="eyebrow">${icon('images', 13)} ${t('Your imagination, collected.')}</p>
        <h1>${t('All creations')}</h1>
        <p class="page-sub">${t('A little gallery of your big ideas.')}</p>
      </div>
      <div class="head-tools">
        <span class="tag">${faNum(state.images.length)} ${t('images')}</span>
        ${isTauri ? `<button class="btn btn-ghost" data-action="open-output">${icon('folder-open', 15)} ${t('Open folder')}</button>` : ''}
      </div>
    </section>
    ${
      state.images.length
        ? `<div class="gallery-grid">${state.images
            .slice(0, 60)
            .map((image, i) => {
              const meta = state.meta[image.name] || {};
              return `<article class="shot">
                <button class="shot-image" data-action="lightbox:${i}" aria-label="${esc(t('View large'))}">
                  <img src="${image.url}" alt="${esc(meta.prompt || image.name)}" loading="lazy" />
                  <span class="shot-veil"><span class="shot-btn">${icon('maximize-2', 16)}</span></span>
                </button>
                <div class="shot-body">
                  <p title="${esc(meta.prompt || image.name)}">${esc(meta.prompt || image.name)}</p>
                  <div class="shot-meta">
                    <span>${meta.seed !== undefined ? `${t('Seed')} ${esc(meta.seed)}` : esc(image.name.slice(0, 18))}</span>
                    <div class="shot-actions">
                      <button class="icon-btn sm" data-action="save-image:${i}" title="${esc(t('Save as…'))}">${icon('download', 14)}</button>
                      ${isTauri ? `<button class="icon-btn sm" data-action="reveal:${i}" title="${esc(t('Show in folder'))}">${icon('folder-open', 14)}</button>` : ''}
                    </div>
                  </div>
                </div>
              </article>`;
            })
            .join('')}</div>`
        : `<div class="card empty-page">
            <span class="empty-icon">${icon('images', 30)}</span>
            <h2>${t('No creations yet')}</h2>
            <p>${t('Your generated images will appear here.')}</p>
            <button class="btn btn-primary" data-page="studio">${icon('sparkles', 16)} ${t('Start creating')}</button>
          </div>`
    }
  </div>`;
}

/* ---------------------------------------------------------------------- *
 * Models view — install, load, unload, delete
 * ---------------------------------------------------------------------- */

function installedCard(model) {
  const loadedHere = state.loaded?.model === model.id;
  const busy = !!state.task;
  const active = state.model === model.id;
  return `
  <article class="model-card installed ${loadedHere ? 'loaded' : ''} ${active ? 'active' : ''}">
    <div class="model-art art-${(model.id.length + model.id.charCodeAt(0)) % 4}"><span>${loadedHere ? '●' : '✦'}</span></div>
    <div class="model-body">
      <div class="model-name">
        <h3>${esc(model.id.split('/').pop())}</h3>
        ${loadedHere ? `<span class="badge ok">${icon('power', 11)} ${t('Loaded')}</span>` : model.ready ? `<span class="badge">${t('Ready')}</span>` : `<span class="badge warn">${t('Not ready')}</span>`}
        ${active ? `<span class="badge">${t('Selected')}</span>` : ''}
      </div>
      <p class="mono" title="${esc(model.id)}">${esc(model.id)}</p>
      <div class="model-meta">
        <span>${icon('hard-drive', 13)} ${formatBytes(model.size)}</span>
        <span>${icon('boxes', 13)} ${faNum(model.files)} ${t('files')}</span>
        ${loadedHere ? `<span>${icon('cpu', 13)} ${esc(String(state.loaded.device).toUpperCase())}${state.loaded.vram ? ` · ${formatBytes(state.loaded.vram * 1024 * 1024)} VRAM` : ''}</span>` : ''}
      </div>
      ${!model.ready ? `<p class="card-warning">${icon('circle-alert', 12)} ${t('Model files are missing.')}</p>` : ''}
    </div>
    <div class="model-actions">
      ${
        loadedHere
          ? `<button class="btn btn-flat" data-action="unload-model" ${busy ? 'disabled' : ''}>${icon('power-off', 14)} ${t('Unload')}</button>`
          : `<button class="btn btn-primary" data-action="load-model:${esc(model.id)}" ${busy || !model.ready ? 'disabled' : ''}>${icon('power', 14)} ${t('Load')}</button>`
      }
      <div class="model-icon-row">
        <button class="icon-btn sm" data-action="use-model:${esc(model.id)}" title="${esc(t('Use model'))}">${icon('check', 14)}</button>
        <button class="icon-btn sm" data-action="open-model:${esc(model.id)}" title="${esc(t('Show in folder'))}">${icon('folder-open', 14)}</button>
        <button class="icon-btn sm danger" data-action="delete-model:${esc(model.id)}" title="${esc(t('Delete'))}">${icon('trash-2', 14)}</button>
      </div>
    </div>
  </article>`;
}

function catalogCard(model, index) {
  const installed = isInstalled(model.id);
  const loadedHere = state.loaded?.model === model.id;
  const downloading = state.task?.kind === 'download' && state.task.model === model.id;
  const active = state.model === model.id;
  return `
  <article class="model-card ${installed ? 'installed' : ''} ${active ? 'active' : ''}">
    <div class="model-art art-${index % 4}"><span>${index === 0 ? '✦' : '✧'}</span></div>
    <div class="model-body">
      <div class="model-name">
        <h3>${esc(model.name)}</h3>
        ${model.badge ? `<span class="badge">${esc(t(model.badge))}</span>` : ''}
        ${installed ? `<span class="badge ok">${icon('check', 11)} ${t('Downloaded')}</span>` : ''}
        ${loadedHere ? `<span class="badge ok">${icon('power', 11)} ${t('Loaded')}</span>` : ''}
      </div>
      <p>${esc(model.description)}</p>
      <div class="model-meta">
        <span class="mono">${icon('boxes', 13)} ${esc(model.id)}</span>
        ${model.size ? `<span>${icon('hard-drive', 13)} ${esc(model.size)}</span>` : ''}
      </div>
    </div>
    <div class="model-actions">
      ${
        downloading
          ? `<div class="mini-progress">
              <div class="progress slim"><span data-live-progress4 style="width:${Math.min(100, Math.max(0, state.progress))}%"></span></div>
              <span><b data-live-percent4>${Math.round(state.progress)}%</b> · ${esc(taskSpeed())}</span>
              <button class="link-btn" data-action="cancel">${t('Stop')}</button>
            </div>`
          : installed
            ? `<button class="btn btn-ghost" data-action="use-model:${esc(model.id)}">${icon('check', 14)} ${active ? t('Selected') : t('Use')}</button>`
            : `<button class="btn btn-primary" data-action="download-model:${esc(model.id)}" ${state.task ? 'disabled' : ''}>${icon('download', 15)} ${t('Download model')}</button>`
      }
      <button class="icon-btn sm" data-action="open-hf:${esc(model.id)}" title="${esc(t('Open in Hugging Face'))}">${icon('external-link', 14)}</button>
    </div>
  </article>`;
}

function models() {
  const totalSize = state.models.reduce((sum, model) => sum + (Number(model.size) || 0), 0);
  const free = state.diagnostics?.free_space;
  return `
  <div class="page">
    <section class="page-head">
      <div>
        <p class="eyebrow">${icon('boxes', 13)} ${t('Model manager')}</p>
        <h1>${t('Model library')}</h1>
        <p class="page-sub">${t('Manage what is on disk, then load one to generate.')}</p>
      </div>
      <div class="head-tools">
        <button class="btn btn-ghost" data-action="refresh-models">${icon('refresh-cw', 15)} ${t('Refresh')}</button>
        <button class="btn btn-ghost" data-action="refresh-catalog">${icon('cloud-download', 15)} ${t('Refresh catalogue')}</button>
      </div>
    </section>

    <section class="storage-bar">
      <div class="storage-item">
        <span class="storage-icon">${icon('hard-drive', 17)}</span>
        <div><small>${t('Download folder')}</small><strong class="mono" title="${esc(state.modelsDir)}">${esc(state.modelsDir || '—')}</strong></div>
      </div>
      <div class="storage-stats">
        <span>${icon('boxes', 13)} ${faNum(state.models.length)} ${t('Models')}</span>
        <span>${icon('database', 13)} ${formatBytes(totalSize)}</span>
        ${free ? `<span>${icon('gauge', 13)} ${t('Free space')}: ${formatBytes(free)}</span>` : ''}
      </div>
      <div class="storage-actions">
        <button class="btn btn-ghost" data-action="choose-models">${icon('folder-open', 14)} ${t('Choose folder')}</button>
      </div>
    </section>

    <section class="card loaded-banner ${state.loaded ? 'on' : ''}">
      <span class="loaded-icon">${icon(state.loaded ? 'power' : 'power-off', 18)}</span>
      <div>
        <strong>${state.loaded ? esc(state.loaded.model) : t('No model is loaded. Generation loads one automatically.')}</strong>
        <p>${
          state.loaded
            ? `${String(state.loaded.device).toUpperCase()}${state.loaded.dtype ? ` · ${esc(state.loaded.dtype)}` : ''}${state.loaded.vram ? ` · ${formatBytes(state.loaded.vram * 1024 * 1024)} VRAM` : ''}${state.loaded.seconds ? ` · ${state.loaded.seconds}s` : ''}`
            : esc(statusLabel())
        }</p>
      </div>
      ${state.loaded ? `<button class="btn btn-ghost" data-action="unload-model" ${state.task ? 'disabled' : ''}>${icon('power-off', 15)} ${t('Unload')}</button>` : ''}
    </section>

    <div class="section-header">
      <h2>${icon('boxes', 16)} ${t('Installed models')} <span>${faNum(state.models.length)}</span></h2>
      <p>${t('Files live on your computer. Load one to keep it in memory.')}</p>
    </div>
    ${
      state.models.length
        ? `<div class="model-grid">${state.models.map(installedCard).join('')}</div>`
        : `<div class="card empty-inline">
            <span class="empty-icon sm">${icon('boxes', 22)}</span>
            <div><strong>${t('No models on disk yet')}</strong><p>${t('Download a model to start creating.')}</p></div>
          </div>`
    }

    <div class="section-header">
      <h2>${icon('cloud-download', 16)} ${t('Download models')}</h2>
      <p>${esc(state.catalogStatus || t('Models download from Hugging Face straight to your computer.'))}</p>
    </div>
    <div class="model-grid">${state.catalog.map((model, i) => catalogCard(model, i)).join('')}</div>

    <section class="card custom-card">
      <div class="card-head compact">
        <span class="card-icon">${icon('boxes', 17)}</span>
        <div class="card-titles"><h2>${t('Custom Hugging Face model')}</h2><p>${t('Custom')} · Diffusers</p></div>
      </div>
      <p class="muted-note">${t('Enter a Diffusers-compatible repository id. Gated models need approval and an HF_TOKEN environment variable.')}</p>
      <div class="custom-row">
        <input id="custom-model" placeholder="username/model-name" dir="ltr" />
        <button class="btn btn-primary" data-action="download-custom" ${state.task ? 'disabled' : ''}>${icon('download', 15)} ${t('Download model')}</button>
      </div>
    </section>

    ${
      state.task
        ? `<section class="card job-card">
            <div class="card-head compact">
              <span class="card-icon">${icon(state.task.kind === 'download' ? 'cloud-download' : state.task.kind === 'load' ? 'power' : 'wand-sparkles', 17)}</span>
              <div class="card-titles"><h2>${esc(taskLabel())}</h2><p data-live-detail>${esc(taskDetail())}</p></div>
              <b class="job-pct" data-live-percent>${Math.round(state.progress)}%</b>
            </div>
            <div class="progress"><span data-live-progress style="width:${Math.min(100, Math.max(0, state.progress))}%"></span></div>
            <div class="job-foot">
              <span class="dot busy"></span><span data-live-status>${esc(statusLabel())}</span>
              <span data-live-elapsed>${formatDuration(state.elapsed)}</span>
              <button class="link-btn" data-action="cancel">${icon('square', 12)} ${t('Stop')}</button>
            </div>
          </section>`
        : ''
    }
    ${pythonAlert()}
  </div>`;
}

function settings() {
  const diagnostics = state.diagnostics;
  return `
  <div class="page">
    <section class="page-head">
      <div>
        <p class="eyebrow">${icon('settings-2', 13)} ${t('Settings')}</p>
        <h1>${t('Settings')}</h1>
        <p class="page-sub">${t('Make DreamCanvas work for you.')}</p>
      </div>
    </section>

    <div class="settings-grid">
      <section class="card setting-card">
        <div class="card-head compact">
          <span class="card-icon">${icon('hard-drive', 17)}</span>
          <div class="card-titles"><h2>${t('Storage & folders')}</h2><p>${t('Where your files live')}</p></div>
        </div>
        <div class="setting-row">
          <div><strong>${t('Model download folder')}</strong><small>${esc(state.modelsDir || '—')}</small></div>
          <button class="btn btn-ghost" data-action="choose-models">${t('Choose folder')}</button>
        </div>
        <div class="setting-row">
          <div><strong>${t('Image output folder')}</strong><small>${esc(state.output || '—')}</small></div>
          <button class="btn btn-ghost" data-action="choose-output">${t('Choose folder')}</button>
        </div>
      </section>

      <section class="card setting-card">
        <div class="card-head compact">
          <span class="card-icon">${icon('cpu', 17)}</span>
          <div class="card-titles"><h2>${t('Compute device')}</h2><p>${esc(state.hardware)}</p></div>
        </div>
        <div class="setting-row">
          <div><strong>${t('Hardware')}</strong><small>${esc(state.hardware)}</small></div>
          <button class="btn btn-ghost" data-action="recheck">${t('Re-check')}</button>
        </div>
        <div class="setting-row">
          <div><strong>${t('Compute device')}</strong><small>${t('Auto detect')} / CPU / CUDA / MPS</small></div>
          <div class="select-shell small"><select id="device">
            ${[
              ['auto', t('Auto detect')],
              ['cpu', 'CPU'],
              ['cuda', 'NVIDIA (CUDA)'],
              ['mps', 'Apple (MPS)'],
            ]
              .map(([value, label]) => `<option value="${value}"${state.device === value ? ' selected' : ''}>${esc(label)}</option>`)
              .join('')}
          </select>${icon('chevron-down', 13)}</div>
        </div>
      </section>

      <section class="card setting-card">
        <div class="card-head compact">
          <span class="card-icon">${icon('power', 17)}</span>
          <div class="card-titles"><h2>${t('Python worker')}</h2><p>${state.workerReady ? `PID ${state.workerInfo?.pid || '—'} · Python ${state.workerInfo?.python || '—'}` : t('Waiting for the worker…')}</p></div>
        </div>
        <div class="setting-row">
          <div><strong>${t('Worker')}</strong><small>${state.workerReady ? `Python ${state.workerInfo?.python || ''} · ${esc(state.workerInfo?.platform || '')}` : esc(state.workerError || t('Waiting for the worker…'))}</small></div>
          <button class="btn btn-ghost" data-action="restart-worker">${icon('refresh-cw', 14)} ${t('Restart worker')}</button>
        </div>
        <div class="setting-row">
          <div><strong>${t('Environment check')}</strong><small>${t('Runs inference locally with Python and Diffusers.')}</small></div>
          <button class="btn btn-ghost" data-action="diagnose" ${state.workerReady ? '' : 'disabled'}>${icon('gauge', 14)} ${t('Run check')}</button>
        </div>
        ${
          diagnostics
            ? `<div class="diagnostics">
                ${Object.entries(diagnostics)
                  .filter(([key]) => !['event'].includes(key))
                  .map(([key, value]) => {
                    let text = value;
                    if (key === 'free_space' || key === 'total_space') text = formatBytes(value);
                    if (typeof value === 'boolean') text = value ? 'yes' : 'no';
                    const bad = typeof value === 'string' && (value.startsWith('missing') || value.startsWith('unreachable'));
                    return `<div class="diag-row ${bad ? 'bad' : ''}"><span>${esc(key)}</span><b class="mono">${esc(text)}</b></div>`;
                  })
                  .join('')}
              </div>`
            : ''
        }
        <div class="python-help">
          <strong>${t('Install the worker dependencies once:')}</strong>
          <code dir="ltr">python3 -m pip install -r scripts/requirements.txt</code>
          <button class="link-btn" data-action="copy-command">${icon('copy', 13)} ${t('Copy command')}</button>
        </div>
      </section>

      <section class="card setting-card">
        <div class="card-head compact">
          <span class="card-icon">${icon('palette', 17)}</span>
          <div class="card-titles"><h2>${t('Appearance')}</h2><p>${t('Switch look and language.')}</p></div>
        </div>
        <div class="setting-row">
          <div><strong>${t('Theme')}</strong><small>${t('Dark')} / ${t('Light')}</small></div>
          <div class="segmented">
            <button class="${state.theme === 'dark' ? 'on' : ''}" data-action="set-theme:dark">${icon('moon', 14)} ${t('Dark')}</button>
            <button class="${state.theme === 'light' ? 'on' : ''}" data-action="set-theme:light">${icon('sun', 14)} ${t('Light')}</button>
          </div>
        </div>
        <div class="setting-row">
          <div><strong>${t('Language')}</strong><small>English / فارسی</small></div>
          <div class="segmented">
            <button class="${state.lang === 'en' ? 'on' : ''}" data-action="set-lang:en">English</button>
            <button class="${state.lang === 'fa' ? 'on' : ''}" data-action="set-lang:fa">فارسی</button>
          </div>
        </div>
      </section>

      <section class="card setting-card">
        <div class="card-head compact">
          <span class="card-icon">${icon('info', 17)}</span>
          <div class="card-titles"><h2>${t('About & updates')}</h2><p>DreamCanvas v${esc(VERSION)}</p></div>
        </div>
        <div class="setting-row">
          <div><strong>${t('Check for updates')}</strong><small>${esc(state.update || t('Runs inference locally with Python and Diffusers.'))}</small></div>
          <button class="btn btn-ghost" data-action="update">${t('Check for updates')}</button>
        </div>
      </section>
    </div>
  </div>`;
}

function shell() {
  return `
  <div class="shell">
    <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
    ${sidebar()}
    <div class="main">
      ${topbar()}
      ${!isTauri ? `<div class="browser-banner">${icon('info', 14)} ${t('Browser preview — model downloads and generation need the desktop app.')}</div>` : ''}
      <main class="content">${state.page === 'studio' ? studio() : state.page === 'gallery' ? gallery() : state.page === 'models' ? models() : settings()}</main>
    </div>
  </div>`;
}

function render() {
  const active = document.activeElement;
  const activeId = active && active.id && active.closest('#app') ? active.id : null;
  const caret = activeId && active.selectionStart !== undefined ? active.selectionStart : null;

  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.platform = isTauri ? 'desktop' : 'web';

  $('#app').innerHTML = shell();
  createIcons({ icons: ICONS });

  if (activeId) {
    const el = document.getElementById(activeId);
    if (el && typeof el.focus === 'function') {
      el.focus({ preventScroll: true });
      if (caret !== null && el.setSelectionRange) {
        try {
          el.setSelectionRange(caret, caret);
        } catch {
          /* not a text input */
        }
      }
    }
  }
  paintLive();
}

/* ------------------------------------------------------------------ *
 * Live updates
 * ------------------------------------------------------------------ */

function taskDetail() {
  if (!state.task) return '';
  if (state.task.kind === 'download') {
    const parts = [];
    if (state.task.file) parts.push(state.task.index ? `${state.task.index}/${state.task.count} · ${state.task.file}` : state.task.file);
    if (state.task.total) parts.push(`${formatBytes(state.task.current)} / ${formatBytes(state.task.total)}`);
    if (state.task.speed) parts.push(`${formatBytes(state.task.speed)}/s`);
    return parts.join('  ·  ');
  }
  if (state.task.kind === 'load') return state.loaded ? '' : t('Loading model…');
  return state.task.steps ? `${t('Steps')} ${state.task.step || 0} / ${state.task.steps}` : '';
}

function taskSpeed() {
  return state.task?.speed ? `${formatBytes(state.task.speed)}/s` : '—';
}

function paintLive() {
  const percent = Math.min(100, Math.max(0, state.progress));
  for (const selector of ['[data-live-progress]', '[data-live-progress2]', '[data-live-progress3]', '[data-live-progress4]']) {
    document.querySelectorAll(selector).forEach((el) => (el.style.width = `${percent}%`));
  }
  document
    .querySelectorAll('[data-live-percent], [data-live-percent2], [data-live-percent3], [data-live-percent4]')
    .forEach((el) => (el.textContent = `${Math.round(percent)}%`));
  document.querySelectorAll('[data-live-status], [data-live-status2]').forEach((el) => (el.textContent = statusLabel()));
  document.querySelectorAll('[data-live-detail]').forEach((el) => (el.textContent = taskDetail()));
  document.querySelectorAll('[data-live-elapsed]').forEach((el) => (el.textContent = formatDuration(state.elapsed)));
}

let elapsedTimer = null;
function startTimer() {
  stopTimer();
  state.startedAt = Date.now();
  state.elapsed = 0;
  elapsedTimer = setInterval(() => {
    state.elapsed = (Date.now() - state.startedAt) / 1000;
    document.querySelectorAll('[data-live-elapsed]').forEach((el) => (el.textContent = formatDuration(state.elapsed)));
  }, 1000);
}
function stopTimer() {
  if (elapsedTimer) clearInterval(elapsedTimer);
  elapsedTimer = null;
}

/* ------------------------------------------------------------------ *
 * Data
 * ------------------------------------------------------------------ */

function sync() {
  const byId = (id) => document.getElementById(id);
  const prompt = byId('prompt');
  if (prompt) state.prompt = prompt.value;
  const negative = byId('negative');
  if (negative) state.negative = negative.value;
  const count = byId('count');
  if (count) state.count = Number(count.value);
  const steps = byId('steps');
  if (steps) state.steps = Number(steps.value);
  const guidance = byId('guidance');
  if (guidance) state.guidance = Number(guidance.value);
  const seed = byId('seed');
  if (seed) state.seed = Number(seed.value);
  const size = byId('size');
  if (size) [state.width, state.height] = size.value.split('x').map(Number);
  const device = byId('device');
  if (device) state.device = device.value;
}

async function resolvePaths() {
  if (!isTauri) return;
  try {
    const paths = await invoke('default_paths');
    if (!state.modelsDir && paths.models) state.modelsDir = paths.models;
    if (!state.output && paths.output) state.output = paths.output;
  } catch (error) {
    console.warn('default_paths failed', error);
  }
}

async function refreshModels() {
  if (!isTauri) return;
  try {
    const list = await invoke('installed_models', { path: state.modelsDir });
    if (!Array.isArray(list)) return;
    state.models = list.map((item) => ({
      id: String(item.id),
      name: String(item.name || item.id),
      path: String(item.path),
      size: Number(item.size) || 0,
      files: Number(item.files) || 0,
      ready: !!item.ready,
    }));
    if (state.models.length && !state.models.some((model) => model.id === state.model)) {
      state.model = state.models[0].id;
      write('dc.model', state.model);
    }
  } catch (error) {
    console.warn('installed_models failed', error);
  }
}

async function loadImages() {
  if (!isTauri || !state.output) return;
  try {
    const paths = await invoke('list_images', { path: state.output });
    const images = [];
    for (const path of paths.slice(0, 60)) {
      try {
        const bytes = await invoke('image_data', { path, output: state.output });
        images.push({
          path,
          name: path.split(/[\\/]/).pop(),
          url: URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' })),
        });
      } catch {
        /* skip unreadable file */
      }
    }
    state.images.forEach((image) => URL.revokeObjectURL(image.url));
    state.images = images;
  } catch (error) {
    console.warn('loadImages failed', error);
  }
}

async function appendImage(path) {
  if (!isTauri || !path) return;
  try {
    const bytes = await invoke('image_data', { path, output: state.output });
    const name = path.split(/[\\/]/).pop();
    state.images.filter((image) => image.path === path).forEach((image) => URL.revokeObjectURL(image.url));
    state.images = [
      { path, name, url: URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' })) },
      ...state.images.filter((image) => image.path !== path),
    ];
  } catch (error) {
    console.warn('appendImage failed', error);
  }
}

function rememberMeta(name, info) {
  state.meta[name] = { ...(state.meta[name] || {}), ...info, at: Date.now() };
  const keys = Object.keys(state.meta);
  if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((key) => delete state.meta[key]);
  write('dc.meta', state.meta);
}

/* ------------------------------------------------------------------ *
 * Commands
 * ------------------------------------------------------------------ */

async function generate() {
  sync();
  if (!state.prompt.trim()) {
    showToast(t('Write a prompt first.'), 'warn');
    document.getElementById('prompt')?.focus();
    return;
  }
  if (!isTauri) {
    showToast(t('This action runs in the desktop app.'), 'warn');
    return;
  }
  if (state.task) {
    showToast(t('Please wait for the current task to finish.'), 'warn');
    return;
  }
  if (!state.models.length) {
    showToast(t('Download a model to start creating.'), 'warn');
    go('models');
    return;
  }
  const current = modelById(state.model);
  if (!current) {
    showToast(t('Download the selected model first.'), 'warn');
    go('models');
    return;
  }
  if (!current.ready) {
    showToast(t('Model files are missing.'), 'err');
    return;
  }

  state.count = clamp(state.count, 1, 50, 1);
  state.steps = clamp(state.steps, 1, 150, 30);
  state.guidance = clamp(state.guidance, 0, 30, 7.5);
  if (!state.output) await resolvePaths();

  const needsLoad = state.loaded?.model !== state.model;
  state.task = {
    kind: 'generate',
    phase: needsLoad ? 'load' : 'generate',
    model: state.model,
    status: needsLoad ? t('Loading model…') : t('Starting generation…'),
    progress: 0,
  };
  state.progress = 0;
  state.status = state.task.status;
  startTimer();
  render();

  const sent = await sendWorker('generate', {
    prompt: state.prompt,
    negative: state.negative,
    model: state.model,
    model_path: modelPath(state.model),
    output: state.output,
    device: state.device,
    count: state.count,
    steps: state.steps,
    guidance: state.guidance,
    width: state.width,
    height: state.height,
    seed: state.seed,
  });
  if (!sent) {
    stopTimer();
    state.task = null;
    render();
  }
}

async function downloadModel(id) {
  const modelId = String(id || '').trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(modelId)) {
    showToast(t('Enter a model id like username/model-name.'), 'err');
    return;
  }
  if (!isTauri) {
    showToast(t('Model downloads run in the desktop app.'), 'warn');
    return;
  }
  if (state.task) {
    showToast(t('Please wait for the current task to finish.'), 'warn');
    return;
  }
  if (!state.modelsDir) await resolvePaths();
  if (!state.modelsDir) {
    showToast(t('Choose a model folder in Settings first.'), 'err');
    go('settings');
    return;
  }

  state.task = { kind: 'download', model: modelId, status: t('Connecting to Hugging Face…'), progress: 0, file: '', index: 0, count: 0 };
  state.progress = 0;
  state.status = state.task.status;
  state.pythonError = '';
  startTimer();
  render();

  const sent = await sendWorker('download', { model: modelId, path: modelPath(modelId) });
  if (!sent) {
    stopTimer();
    state.task = null;
    render();
  }
}

async function loadModel(id) {
  if (!isTauri) {
    showToast(t('This action runs in the desktop app.'), 'warn');
    return;
  }
  if (state.task) {
    showToast(t('Please wait for the current task to finish.'), 'warn');
    return;
  }
  if (!id) return;
  state.model = id;
  write('dc.model', id);
  state.task = { kind: 'load', model: id, status: t('Loading model…'), progress: 0 };
  state.status = t('Loading model…');
  state.progress = 0;
  startTimer();
  render();
  const sent = await sendWorker('load', { model: id, model_path: modelPath(id), device: state.device });
  if (!sent) {
    stopTimer();
    state.task = null;
    render();
  }
}

function unloadModel() {
  return new Promise((resolve) => {
    if (!isTauri) return resolve();
    if (!state.loaded) return resolve();
    state.pendingUnload = resolve;
    sendWorker('unload');
    setTimeout(() => {
      if (state.pendingUnload === resolve) {
        state.pendingUnload = null;
        resolve();
      }
    }, 3000);
  });
}

async function deleteModel(id) {
  const model = modelById(id);
  if (!model) return;
  if (state.task) {
    showToast(t('Please wait for the current task to finish.'), 'warn');
    return;
  }
  const ok = await confirmDialog({
    title: t('Delete model?'),
    body: `${model.id} · ${formatBytes(model.size)} — ${t('This deletes the downloaded files from disk.')}`,
    confirmLabel: t('Delete'),
  });
  if (!ok) return;
  try {
    if (state.loaded?.model === model.id) await unloadModel();
    await invoke('delete_model', { modelsDir: state.modelsDir, path: model.path });
    await refreshModels();
    showToast(t('Model deleted'), 'ok');
  } catch (error) {
    showToast(String(error || ''), 'err');
  }
  render();
}

async function saveImage(image) {
  if (!image) return;
  if (!isTauri) {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name || 'dreamcanvas.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(t('Image download started.'), 'ok');
    return;
  }
  try {
    const destination = await save({
      title: t('Save image'),
      defaultPath: image.name || 'dreamcanvas.png',
      filters: [{ name: 'PNG', extensions: ['png'] }],
    });
    if (!destination) return;
    await invoke('save_image', { path: image.path, output: state.output, destination });
    showToast(t('Image saved'), 'ok');
  } catch (error) {
    showToast(`${t('Could not save the image.')} ${String(error || '')}`.trim(), 'err');
  }
}

async function revealImage(image) {
  if (!image || !isTauri) return;
  try {
    await revealItemInDir(image.path);
  } catch {
    await openOutput();
  }
}

async function openOutput() {
  if (!isTauri || !state.output) return;
  try {
    await openPath(state.output);
  } catch (error) {
    try {
      await revealItemInDir(state.output);
    } catch {
      showToast(String(error || t('Open folder')), 'err');
    }
  }
}

async function openModelFolder(id) {
  const model = modelById(id);
  if (!model) return;
  try {
    await openPath(model.path);
  } catch (error) {
    showToast(String(error || t('Open folder')), 'err');
  }
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(label, 'ok');
  } catch {
    showToast(t('Could not copy.'), 'err');
  }
}

function translate() {
  sync();
  if (!state.prompt.trim()) {
    showToast(t('Write a prompt first.'), 'warn');
    return;
  }
  const url = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(state.prompt)}&op=translate`;
  if (isTauri) openUrl(url);
  else window.open(url, '_blank', 'noopener');
}

async function chooseFolder(key) {
  if (!isTauri) {
    showToast(t('Folder selection is available in the desktop app.'), 'warn');
    return;
  }
  try {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    const value = Array.isArray(selected) ? selected[0] : selected;
    if (!value) return;
    state[key] = value;
    write(key === 'modelsDir' ? 'dc.modelsDir' : 'dc.output', value);
    if (key === 'modelsDir') {
      if (state.loaded) await unloadModel();
      await refreshModels();
    }
    if (key === 'output') await loadImages();
    render();
  } catch (error) {
    showToast(String(error || 'Folder selection failed.'), 'err');
  }
}

async function refreshCatalog() {
  state.catalogStatus = t('Loading model catalogue…');
  if (state.page === 'models') render();

  const sources = [];
  try {
    const release = await fetch('https://api.github.com/repos/Manixpcshot/ImageGenerator-ai/releases/latest', { cache: 'no-store' });
    if (release.ok) {
      const tag = (await release.json()).tag_name;
      if (tag) sources.push(`https://raw.githubusercontent.com/Manixpcshot/ImageGenerator-ai/${encodeURIComponent(tag)}/catalog/models.json`);
    }
  } catch {
    /* offline */
  }
  sources.push('https://raw.githubusercontent.com/Manixpcshot/ImageGenerator-ai/main/catalog/models.json');

  for (const url of sources) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const items = await response.json();
      const valid = (Array.isArray(items) ? items : []).filter(
        (m) => m && typeof m.id === 'string' && /^[\w.-]+\/[\w.-]+$/.test(m.id) && typeof m.name === 'string' && typeof m.description === 'string'
      );
      if (!valid.length) continue;
      state.catalog = valid;
      state.catalogStatus = t('Catalog updated from GitHub.');
      if (state.page === 'models') render();
      return;
    } catch {
      /* try next source */
    }
  }
  state.catalog = bundledCatalog;
  state.catalogStatus = t('Bundled catalogue · offline mode');
  if (state.page === 'models') render();
}

function compareVersions(a, b) {
  const left = String(a).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = String(b).split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

async function checkUpdate() {
  state.update = t('Loading…');
  render();
  try {
    const response = await fetch('https://api.github.com/repos/Manixpcshot/ImageGenerator-ai/releases/latest', { cache: 'no-store' });
    if (!response.ok) throw new Error('no release');
    const release = await response.json();
    const latest = String(release.tag_name || '').replace(/^v/, '');
    if (!latest || compareVersions(latest, VERSION) <= 0) {
      state.update = t('You are up to date.');
    } else {
      state.update = `${t('Version')} ${latest}`;
      if (isTauri) await openUrl(release.html_url);
      else window.open(release.html_url, '_blank', 'noopener');
    }
  } catch {
    state.update = t('Could not check releases.');
  }
  render();
}

function randomPrompt() {
  const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  state.prompt = state.lang === 'fa' ? pick.fa : pick.en;
  render();
  document.getElementById('prompt')?.focus();
}

function go(page) {
  sync();
  state.page = page;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setTheme(theme) {
  state.theme = theme;
  write('dc.theme', theme);
  render();
}

function setLang(lang) {
  const prompt = document.getElementById('prompt');
  if (prompt) state.prompt = prompt.value;
  state.lang = lang;
  write('dc.lang', lang);
  render();
}

/* ------------------------------------------------------------------ *
 * Worker events
 * ------------------------------------------------------------------ */

function clearTask() {
  if (state.task) stopTimer();
  state.task = null;
  state.progress = 0;
  state.status = '';
}

function onWorkerEvent(event) {
  const payload = event.payload || {};
  switch (payload.event) {
    case 'ready': {
      state.workerReady = true;
      state.workerStarting = false;
      state.workerInfo = payload;
      state.workerError = '';
      state.pythonError = '';
      sendWorker('hardware');
      render();
      break;
    }
    case 'worker-exit': {
      const wasReady = state.workerReady;
      state.workerReady = false;
      state.loaded = null;
      clearTask();
      if (wasReady) showToast(t('Worker stopped unexpectedly.'), 'warn');
      render();
      break;
    }
    case 'worker-log':
      console.warn('[worker]', payload.message);
      break;
    case 'hardware': {
      state.hardware = payload.cuda && payload.gpu ? payload.gpu : payload.mps ? t('Apple GPU detected') : t('CPU detected');
      render();
      break;
    }
    case 'diagnose': {
      state.diagnostics = payload;
      if (state.page === 'settings') render();
      showToast(t('Environment check'), 'ok');
      break;
    }
    case 'task-start':
      break;
    case 'load-start': {
      if (!state.task || state.task.kind === 'generate') {
        state.task = { kind: 'load', model: payload.model, status: t('Loading model…'), progress: 0 };
        state.status = t('Loading model…');
        state.progress = 0;
        startTimer();
      } else {
        state.status = t('Loading model…');
      }
      render();
      break;
    }
    case 'loaded': {
      state.loaded = payload;
      clearTask();
      showToast(`${t('Model loaded')} · ${String(payload.device || '').toUpperCase()} · ${payload.seconds || 0}s`, 'ok');
      render();
      break;
    }
    case 'unloaded': {
      state.loaded = null;
      const resolve = state.pendingUnload;
      state.pendingUnload = null;
      if (resolve) resolve();
      showToast(t('Model unloaded'), 'ok');
      render();
      break;
    }
    case 'download-plan': {
      if (state.task) {
        state.task.count = Number(payload.files) || 0;
        state.task.total = Number(payload.total) || 0;
      }
      paintLive();
      break;
    }
    case 'download-file': {
      if (state.task) {
        state.task.file = payload.file;
        state.task.index = Number(payload.index) || 0;
        state.task.count = Number(payload.count) || state.task.count;
      }
      paintLive();
      break;
    }
    case 'download': {
      if (state.task) {
        state.task.current = Number(payload.current) || 0;
        state.task.total = Number(payload.total) || state.task.total;
        state.task.speed = Number(payload.speed) || 0;
        state.task.file = payload.file || state.task.file;
        state.progress = state.task.total ? (state.task.current / state.task.total) * 100 : state.progress;
      }
      paintLive();
      break;
    }
    case 'downloaded': {
      const modelId = payload.model;
      clearTask();
      if (modelId) {
        state.model = modelId;
        write('dc.model', modelId);
      }
      refreshModels().then(() => render());
      showToast(`${t('Download complete')} · ${formatBytes(payload.size)}`, 'ok');
      if (payload.ready === false) showToast(t('Model files are missing.'), 'warn');
      render();
      break;
    }
    case 'generation': {
      if (state.task) {
        state.task.phase = 'generate';
        state.task.step = Number(payload.step) || 0;
        state.task.steps = Number(payload.steps) || state.task.steps;
        state.task.index = Number(payload.current) || 0;
        state.task.count = Number(payload.count) || state.task.count;
        const steps = state.task.steps || state.steps;
        state.progress = Math.min(99, ((state.task.index + (state.task.step || 0) / Math.max(1, steps)) / Math.max(1, state.task.count)) * 100);
      }
      paintLive();
      break;
    }
    case 'image': {
      if (payload.path) {
        const name = String(payload.path).split(/[\\/]/).pop();
        rememberMeta(name, { prompt: payload.prompt || state.prompt, seed: payload.seed, model: payload.model || state.model });
        appendImage(payload.path).then(() => render());
      }
      break;
    }
    case 'done': {
      if (payload.task === 'generate') {
        clearTask();
        state.status = t('Generation complete');
        loadImages().then(() => render());
        showToast(`${t('Generation complete')}${payload.seconds ? ` · ${payload.seconds}s` : ''}`, 'ok');
        render();
      }
      break;
    }
    case 'cancelled': {
      clearTask();
      state.status = t('Cancelled');
      showToast(t('Cancelled'), 'warn');
      render();
      break;
    }
    case 'error': {
      state.pythonError = payload.message || '';
      clearTask();
      showToast(payload.message || t('Generation failed'), 'err');
      render();
      break;
    }
    case 'cancel-requested': {
      if (state.task) {
        state.status = t('Cancelling…');
        paintLive();
      }
      break;
    }
    case 'status': {
      state.status = payload.message || state.status;
      paintLive();
      break;
    }
    default:
      break;
  }
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

const COMMANDS = {
  theme: () => setTheme(state.theme === 'dark' ? 'light' : 'dark'),
  lang: () => setLang(state.lang === 'fa' ? 'en' : 'fa'),
  generate,
  surprise: randomPrompt,
  advanced: () => {
    sync();
    state.advanced = !state.advanced;
    render();
  },
  translate,
  update: checkUpdate,
  recheck: recheckHardware,
  'refresh-catalog': refreshCatalog,
  'refresh-models': () => refreshModels().then(render),
  'choose-models': () => chooseFolder('modelsDir'),
  'choose-output': () => chooseFolder('output'),
  'open-output': openOutput,
  'copy-prompt': () => (state.images[0] ? copyText(state.meta[state.images[0].name]?.prompt || state.images[0].name, t('Prompt copied')) : null),
  'copy-command': () => copyText('python3 -m pip install -r scripts/requirements.txt', t('Command copied')),
  'download-custom': () => downloadModel(document.getElementById('custom-model')?.value || ''),
  'unload-model': () => {
    unloadModel();
    render();
  },
  cancel: () => {
    if (state.task) {
      state.status = t('Cancelling…');
      paintLive();
    }
    sendWorker('cancel');
  },
  'restart-worker': () => startWorker(),
  diagnose: () => sendWorker('diagnose', { models_dir: state.modelsDir }),
};

function onClick(event) {
  const pageTarget = event.target.closest('[data-page]');
  if (pageTarget) {
    go(pageTarget.dataset.page);
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const [action, ...rest] = target.dataset.action.split(':');
  const value = rest.join(':');

  if (COMMANDS[action]) {
    COMMANDS[action](value);
    return;
  }
  if (action === 'set-theme') setTheme(value);
  if (action === 'set-lang') setLang(value);
  if (action === 'sample') {
    state.prompt = state.lang === 'fa' ? SAMPLES[Number(value)].fa : SAMPLES[Number(value)].en;
    render();
    document.getElementById('prompt')?.focus();
  }
  if (action === 'download-model') downloadModel(value);
  if (action === 'load-model') loadModel(value);
  if (action === 'delete-model') deleteModel(value);
  if (action === 'open-model') openModelFolder(value);
  if (action === 'use-model') {
    state.model = value;
    write('dc.model', value);
    render();
    showToast(`${t('Selected')} · ${value}`, 'ok');
  }
  if (action === 'open-hf') {
    const url = `https://huggingface.co/${value}`;
    if (isTauri) openUrl(url);
    else window.open(url, '_blank', 'noopener');
  }
  if (action === 'lightbox') openLightbox(Number(value));
  if (action === 'view-large') openLightbox(Number(value) || 0);
  if (action === 'save-image') saveImage(state.images[Number(value)]);
  if (action === 'reveal') revealImage(state.images[Number(value)]);
}

function onInput(event) {
  const el = event.target;
  if (!el.id) return;
  if (el.id === 'prompt') {
    state.prompt = el.value;
    const counter = document.getElementById('promptCount');
    if (counter) counter.textContent = `${faNum(el.value.length)} / 800`;
  }
  if (el.id === 'negative') state.negative = el.value;
  if (el.id === 'count') state.count = Number(el.value);
  if (el.id === 'steps') state.steps = Number(el.value);
  if (el.id === 'guidance') state.guidance = Number(el.value);
  if (el.id === 'seed') state.seed = Number(el.value);
  if (el.id === 'size') [state.width, state.height] = el.value.split('x').map(Number);
  if (el.id === 'model' && el.value !== state.model) {
    state.model = el.value;
    write('dc.model', el.value);
    render();
  }
  if (el.id === 'device' && el.value !== state.device) {
    state.device = el.value;
    write('dc.device', el.value);
    if (state.loaded) showToast(t('Reload to apply the new device.'), 'warn');
  }
}

function recheckHardware() {
  if (!state.workerReady) {
    startWorker();
    return;
  }
  sendWorker('hardware');
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    closeLightbox();
    closeDialog();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && state.page === 'studio' && !state.task) {
    event.preventDefault();
    generate();
  }
  const lightbox = document.getElementById('lightbox');
  if (lightbox && state.images.length > 1) {
    if (event.key === 'ArrowLeft') stepLightbox(state.lang === 'fa' ? 1 : -1);
    if (event.key === 'ArrowRight') stepLightbox(state.lang === 'fa' ? -1 : 1);
  }
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

async function boot() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('keydown', onKeydown);

  state.catalogStatus = t('Loading model catalogue…');
  state.status = t('Starting the Python worker…');
  render();

  if (isTauri) {
    try {
      await listen('worker-event', onWorkerEvent);
    } catch (error) {
      console.warn('listen failed', error);
    }
    await resolvePaths();
    await refreshModels();
    await loadImages();
    render();
    startWorker({ quiet: true });
  } else {
    state.hardware = t('Browser preview');
    render();
  }

  refreshCatalog();
}

boot();
