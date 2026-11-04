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
  Maximize2,
  Moon,
  Palette,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  WandSparkles,
  X,
} from 'lucide';

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
  Maximize2,
  Moon,
  Palette,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  WandSparkles,
  X,
};
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openPath, openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';

/* ------------------------------------------------------------------ *
 * Constants & tiny helpers
 * ------------------------------------------------------------------ */

const VERSION = pkg.version;
const isTauri = !!window.__TAURI_INTERNALS__;
const $ = (sel) => document.querySelector(sel);

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

/** Join a directory and a name using the separator the directory already uses. */
const joinPath = (dir, name) => {
  const base = String(dir || '').replace(/[\\/]+$/, '');
  const sep = base.includes('\\') ? '\\' : '/';
  return `${base}${sep}${name}`;
};

/** Hugging Face ids contain slashes; folders use dashes. */
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

const faNum = (value) => (state.lang === 'fa' ? Number(value).toLocaleString('fa-IR') : Number(value).toLocaleString('en-US'));

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

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
  'Compose': 'ساخت تصویر',
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
  'Random': 'تصادفی',
  'Generate image': 'ساخت تصویر',
  'Working…': 'در حال کار…',
  'Canvas': 'بوم',
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
  'Downloaded': 'دانلود شده',
  'Downloading': 'در حال دانلود',
  'Use model': 'انتخاب مدل',
  'Selected': 'انتخاب شده',
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
  'Preparing download…': 'در حال آماده‌سازی دانلود…',
  'Model downloaded and ready': 'مدل دانلود شد و آماده است',
  'Model ready to use': 'مدل آماده‌ی استفاده است',
  'Download failed': 'دانلود ناموفق بود',
  'Write a prompt first.': 'اول یک پرامپت بنویس.',
  'Download the selected model first.': 'اول مدل انتخاب‌شده را دانلود کن.',
  'Images must be between 1 and 50.': 'تعداد تصاویر باید بین ۱ تا ۵۰ باشد.',
  'Steps must be between 1 and 150.': 'مراحل باید بین ۱ تا ۱۵۰ باشد.',
  'Guidance must be between 0 and 30.': 'هدایت باید بین ۰ تا ۳۰ باشد.',
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
  'No published release found': 'هیچ نسخه‌ی منتشرشده‌ای پیدا نشد',
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
  'Files ready': 'فایل‌های آماده',
  'No model selected': 'مدلی انتخاب نشده',
  'Current image': 'تصویر جاری',
  'Bundled': 'همراه برنامه',
  'Approx. size': 'حجم تقریبی',
  'installed': 'نصب‌شده',
  'images': 'تصویر',
  'steps': 'مرحله',
  'Back': 'بازگشت',
  'Close': 'بستن',
  'Next': 'بعدی',
  'Previous': 'قبلی',
  'Save image': 'ذخیره‌ی تصویر',
  'Copy prompt': 'کپی پرامپت',
  'Original prompt': 'پرامپت اصلی',
  'Open in Hugging Face': 'باز کردن در Hugging Face',
  'Custom': 'دلخواه',
  'Recommended': 'پیشنهادی',
  'Fast': 'سریع',
  'Detailed': 'پرجزئیات',
  'Classic': 'کلاسیک',
  'Built for imagination': 'ساخته‌شده برای خیال',
  'Every big idea starts with a small spark.': 'هر ایده‌ی بزرگ با یک جرقه‌ی کوچک شروع می‌شود.',
  'Enter a model id first.': 'اول شناسه‌ی مدل را وارد کن.',
  'Model settings': 'تنظیمات مدل',
  'Quality': 'کیفیت',
  'Hardware': 'سخت‌افزار',
  'Where your files live': 'محل نگهداری فایل‌ها',
  'Models and images stay on this computer.': 'مدل‌ها و تصاویر روی همین کامپیوتر می‌مانند.',
  'Switch look and language.': 'ظاهر و زبان را تغییر بده.',
  'Runs inference locally with Python and Diffusers.': 'استنتاج را به‌صورت محلی با پایتون و Diffusers اجرا می‌کند.',
  'Install the worker dependencies once:': 'یک‌بار وابستگی‌های سرویس را نصب کن:',
  'Version': 'نسخه',
  'Refresh': 'تازه‌سازی',
  'All': 'همه',
  'Show in folder': 'نمایش در پوشه',
  'New': 'جدید',
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
  installed: read('dc.downloaded', {}),
  catalog: bundledCatalog,
  catalogStatus: '',
  images: [],
  meta: read('dc.meta', {}),
  job: null,
  downloading: null,
  status: 'Ready to create',
  progress: 0,
  jobStartedAt: 0,
  elapsed: 0,
  workerErrorAt: 0,
  update: '',
  pythonError: '',
  lightbox: -1,
};

/* ------------------------------------------------------------------ *
 * Toast + overlays
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
  }, 4200);
}

function closeLightbox() {
  const el = document.getElementById('lightbox');
  if (el) el.remove();
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
 * Rendering
 * ------------------------------------------------------------------ */

const iconBtn = (action, glyph, label, extra = '') =>
  `<button class="icon-btn ${extra}" data-action="${action}" title="${esc(label)}" aria-label="${esc(label)}">${icon(glyph, 16)}</button>`;

function statusLabel() {
  return state.status || t('Ready to create');
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
              const badge = page.id === 'gallery' ? state.images.length : page.id === 'models' ? Object.keys(state.installed).length : 0;
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
      <span class="side-online" title="${esc(state.hardware)}"><i></i></span>
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
      ${state.job ? `<span class="job-pill"><i class="spin-dot"></i>${esc(state.job === 'download' ? t('Downloading') : t('Working…'))}<b>${Math.round(state.progress)}%</b></span>` : ''}
      <span class="hardware-pill" title="${esc(t('Hardware'))}">${icon('cpu', 14)}<span>${esc(state.hardware)}</span></span>
      <button class="icon-btn" data-action="translate" title="${esc(t('Translate prompt'))}" aria-label="${esc(t('Translate prompt'))}">${icon('languages', 17)}</button>
      <button class="icon-btn" data-action="theme" title="${esc(t('Theme'))}" aria-label="${esc(t('Theme'))}">${icon(state.theme === 'dark' ? 'sun' : 'moon', 17)}</button>
      <button class="lang-btn" data-action="lang" title="${esc(t('Language'))}">${state.lang === 'fa' ? 'EN' : 'FA'}</button>
    </div>
  </header>`;
}

function statsStrip() {
  return `
    <div class="stats">
      <div class="stat"><span>${icon('images', 14)}</span><strong>${faNum(state.images.length)}</strong><small>${t('images')}</small></div>
      <div class="stat"><span>${icon('boxes', 14)}</span><strong>${faNum(Object.keys(state.installed).length)}</strong><small>${t('Downloaded')}</small></div>
      <div class="stat"><span>${icon('gauge', 14)}</span><strong>${state.job ? `${Math.round(state.progress)}%` : esc(deviceLabel())}</strong><small>${t('Compute device')}</small></div>
    </div>`;
}

function deviceLabel() {
  const map = { auto: 'AUTO', cpu: 'CPU', cuda: 'CUDA', mps: 'MPS' };
  return map[state.device] || 'AUTO';
}

function modelOptions() {
  const catalog = [...state.catalog];
  if (state.model && !catalog.some((m) => m.id === state.model)) {
    catalog.unshift({ id: state.model, name: state.model, description: '', badge: '' });
  }
  return catalog
    .map(
      (m) =>
        `<option value="${esc(m.id)}"${m.id === state.model ? ' selected' : ''}>${esc(m.name)}${state.installed[m.id] ? ' ✓' : ''}</option>`
    )
    .join('');
}

function studio() {
  const busy = state.job === 'generate';
  const downloading = state.job === 'download';
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
          <div class="card-titles">
            <h2>${t('Compose')}</h2>
            <p>${t('Your imagination, made visible.')}</p>
          </div>
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

        <div class="field-grid">
          <div class="field">
            <label for="model">${t('Model')}</label>
            <div class="select-shell"><select id="model">${modelOptions()}</select>${icon('chevron-down', 14)}</div>
            <small class="field-note ${state.installed[state.model] ? 'ok' : 'warn'}">
              ${state.installed[state.model] ? `● ${t('Downloaded')}` : `○ ${t('Download the selected model first.')}`}
            </small>
          </div>
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

        <button class="generate ${busy ? 'is-busy' : ''}" data-action="generate" ${state.job ? 'disabled' : ''}>
          <span class="generate-glow"></span>
          ${busy ? `<i class="spinner"></i> ${t('Working…')}` : `${icon('sparkles', 18)} ${t('Generate image')}`}
          <span class="generate-key">⌘↵</span>
        </button>

        <div class="job-line" aria-live="polite">
          <span class="dot ${state.job ? 'busy' : ''}"></span>
          <span class="job-text" data-live-status>${esc(statusLabel())}</span>
          ${state.job ? `<span class="job-meta"><b data-live-percent>${Math.round(state.progress)}%</b><span data-live-elapsed>${formatDuration(state.elapsed)}</span></span>` : ''}
        </div>
        ${
          state.job
            ? `<div class="progress"><span data-live-progress style="width:${Math.min(100, Math.max(0, state.progress))}%"></span></div>
               <p class="job-detail" data-live-detail>${esc(downloadDetail())}</p>`
            : ''
        }
        ${state.pythonError ? `<div class="alert">${icon('circle-alert', 15)}<div><strong>${t('Python worker')}</strong><p>${esc(state.pythonError)}</p><button class="link-btn" data-action="copy-command">${icon('copy', 13)} ${t('Copy command')}</button></div></div>` : ''}
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

          <div class="canvas ${busy ? 'busy' : ''} ${latest ? 'filled' : ''}">
            ${
              busy
                ? `<div class="creating">
                    <div class="orb"><span class="halo"></span><span class="halo"></span><span class="halo"></span>${icon('sparkles', 26)}</div>
                    <h3>${t('Creating your image')}</h3>
                    <p>${t('Local model is painting with light…')}</p>
                    <div class="creating-meta"><span data-live-status2>${esc(statusLabel())}</span><b data-live-percent2>${Math.round(state.progress)}%</b></div>
                    <div class="progress slim"><span data-live-progress2 style="width:${Math.min(100, Math.max(0, state.progress))}%"></span></div>
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
            ${downloading ? `<div class="download-badge">${icon('cloud-download', 15)} <span>${esc(state.downloading?.id || '')}</span><b data-live-percent3>${Math.round(state.progress)}%</b></div>` : ''}
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
              : `<div class="canvas-foot">
                  <span>${icon('hard-drive', 13)} ${t('Images are saved automatically to your output folder.')}</span>
                </div>`
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
                  <span class="shot-veil">
                    <span class="shot-btn">${icon('maximize-2', 16)}</span>
                  </span>
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

function modelCard(model, index, busy) {
  const installed = !!state.installed[model.id];
  const active = state.model === model.id;
  const downloading = state.downloading?.id === model.id;
  return `
  <article class="model-card ${installed ? 'installed' : ''} ${active ? 'active' : ''}">
    <div class="model-art art-${index % 4}"><span>${index === 0 ? '✦' : '✧'}</span></div>
    <div class="model-body">
      <div class="model-name">
        <h3>${esc(model.name)}</h3>
        ${model.badge ? `<span class="badge">${esc(t(model.badge))}</span>` : ''}
        ${installed ? `<span class="badge ok">${icon('check', 11)} ${t('Downloaded')}</span>` : ''}
      </div>
      <p>${esc(model.description)}</p>
      <div class="model-meta">
        <span>${icon('boxes', 13)} ${esc(model.id)}</span>
        ${model.size ? `<span>${icon('hard-drive', 13)} ${esc(t('Approx. size'))}: ${esc(model.size)}</span>` : ''}
      </div>
    </div>
    <div class="model-actions">
      ${
        downloading
          ? `<div class="mini-progress">
              <div class="progress slim"><span data-live-progress4 style="width:${Math.min(100, Math.max(0, state.progress))}%"></span></div>
              <span><b data-live-percent4>${Math.round(state.progress)}%</b> · ${esc(downloadSpeed())}</span>
            </div>`
          : installed
            ? `<button class="btn ${active ? 'btn-flat' : 'btn-ghost'}" data-action="use-model:${esc(model.id)}" ${active ? 'disabled' : ''}>${active ? `${icon('check', 14)} ${t('Selected')}` : t('Use model')}</button>`
            : `<button class="btn btn-primary" data-action="download-model:${esc(model.id)}" ${busy ? 'disabled' : ''}>${icon('download', 15)} ${t('Download model')}</button>`
      }
      <button class="icon-btn sm" data-action="open-hf:${esc(model.id)}" title="${esc(t('Open in Hugging Face'))}">${icon('external-link', 14)}</button>
    </div>
  </article>`;
}

function models() {
  const busy = !!state.job;
  return `
  <div class="page">
    <section class="page-head">
      <div>
        <p class="eyebrow">${icon('boxes', 13)} ${t('Model catalogue')}</p>
        <h1>${t('Model library')}</h1>
        <p class="page-sub">${esc(state.catalogStatus || t('Models download from Hugging Face straight to your computer.'))}</p>
      </div>
      <div class="head-tools">
        <button class="btn btn-ghost" data-action="refresh-catalog">${icon('refresh-cw', 15)} ${t('Refresh catalogue')}</button>
      </div>
    </section>

    <div class="notice">
      <span class="notice-icon">${icon('cloud-download', 17)}</span>
      <div>
        <strong>${t('Models download from Hugging Face straight to your computer.')}</strong>
        <p>${esc(state.modelsDir || t('Choose folder'))}</p>
      </div>
      <button class="btn btn-ghost" data-action="choose-models">${t('Choose folder')}</button>
    </div>

    <div class="model-grid">${state.catalog.map((model, i) => modelCard(model, i, busy)).join('')}</div>

    <section class="card custom-card">
      <div class="card-head compact">
        <span class="card-icon">${icon('boxes', 17)}</span>
        <div class="card-titles"><h2>${t('Custom Hugging Face model')}</h2><p>${t('Custom')} · Diffusers</p></div>
      </div>
      <p class="muted-note">${t('Enter a Diffusers-compatible repository id. Gated models need approval and an HF_TOKEN environment variable.')}</p>
      <div class="custom-row">
        <input id="custom-model" placeholder="username/model-name" dir="ltr" />
        <button class="btn btn-primary" data-action="download-custom" ${busy ? 'disabled' : ''}>${icon('download', 15)} ${t('Download model')}</button>
      </div>
    </section>

    ${state.pythonError ? `<div class="alert">${icon('circle-alert', 15)}<div><strong>${t('Python worker')}</strong><p>${esc(state.pythonError)}</p><button class="link-btn" data-action="copy-command">${icon('copy', 13)} ${t('Copy command')}</button></div></div>` : ''}

    ${
      state.job
        ? `<section class="card job-card">
            <div class="card-head compact">
              <span class="card-icon">${icon(state.job === 'download' ? 'cloud-download' : 'wand-sparkles', 17)}</span>
              <div class="card-titles"><h2>${state.job === 'download' ? t('Downloading') : t('Working…')}</h2><p data-live-detail>${esc(downloadDetail())}</p></div>
              <b class="job-pct" data-live-percent>${Math.round(state.progress)}%</b>
            </div>
            <div class="progress"><span data-live-progress style="width:${Math.min(100, Math.max(0, state.progress))}%"></span></div>
            <div class="job-foot"><span class="dot busy"></span><span data-live-status>${esc(statusLabel())}</span><span data-live-elapsed>${formatDuration(state.elapsed)}</span></div>
          </section>`
        : ''
    }
  </div>`;
}

function settings() {
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
        <div class="python-help">
          <strong>${t('Install the worker dependencies once:')}</strong>
          <code dir="ltr">python3 -m pip install -r scripts/requirements.txt</code>
          <button class="link-btn" data-action="copy-command">${icon('copy', 13)} ${t('Copy command')}</button>
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
}

/* ------------------------------------------------------------------ *
 * Live (non-re-rendering) updates
 * ------------------------------------------------------------------ */

function downloadSpeed() {
  const speed = state.downloading?.speed || 0;
  return speed > 0 ? `${formatBytes(speed)}/s` : '—';
}

function downloadDetail() {
  if (state.job !== 'download' || !state.downloading) return '';
  const { file, bytes, total, speed } = state.downloading;
  const parts = [];
  if (file) parts.push(file);
  if (total) parts.push(`${formatBytes(bytes)} / ${formatBytes(total)}`);
  if (speed) parts.push(`${formatBytes(speed)}/s`);
  return parts.join('  ·  ');
}

function paintLive() {
  const percent = Math.min(100, Math.max(0, state.progress));
  document.querySelectorAll('[data-live-progress]').forEach((el) => (el.style.width = `${percent}%`));
  document.querySelectorAll('[data-live-progress2]').forEach((el) => (el.style.width = `${percent}%`));
  document.querySelectorAll('[data-live-progress4]').forEach((el) => (el.style.width = `${percent}%`));
  document.querySelectorAll('[data-live-percent], [data-live-percent2], [data-live-percent3], [data-live-percent4]').forEach((el) => {
    el.textContent = `${Math.round(percent)}%`;
  });
  document.querySelectorAll('[data-live-status], [data-live-status2]').forEach((el) => (el.textContent = statusLabel()));
  document.querySelectorAll('[data-live-detail]').forEach((el) => (el.textContent = downloadDetail()));
  document.querySelectorAll('[data-live-elapsed]').forEach((el) => (el.textContent = formatDuration(state.elapsed)));
}

let elapsedTimer = null;
function startTimer() {
  stopTimer();
  state.jobStartedAt = Date.now();
  state.elapsed = 0;
  elapsedTimer = setInterval(() => {
    state.elapsed = (Date.now() - state.jobStartedAt) / 1000;
    document.querySelectorAll('[data-live-elapsed]').forEach((el) => (el.textContent = formatDuration(state.elapsed)));
  }, 1000);
}
function stopTimer() {
  if (elapsedTimer) clearInterval(elapsedTimer);
  elapsedTimer = null;
}

/* ------------------------------------------------------------------ *
 * Data & worker actions
 * ------------------------------------------------------------------ */

function sync() {
  const readValue = (id) => document.getElementById(id);
  const prompt = readValue('prompt');
  if (prompt) state.prompt = prompt.value;
  const negative = readValue('negative');
  if (negative) state.negative = negative.value;
  const count = readValue('count');
  if (count) state.count = Number(count.value);
  const steps = readValue('steps');
  if (steps) state.steps = Number(steps.value);
  const guidance = readValue('guidance');
  if (guidance) state.guidance = Number(guidance.value);
  const seed = readValue('seed');
  if (seed) state.seed = Number(seed.value);
  const size = readValue('size');
  if (size) [state.width, state.height] = size.value.split('x').map(Number);
  const device = readValue('device');
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

async function refreshInstalled() {
  if (!isTauri || !state.modelsDir) return;
  try {
    const ids = await invoke('installed_models', { path: state.modelsDir });
    if (Array.isArray(ids)) {
      state.installed = Object.fromEntries(ids.map((id) => [id, true]));
      write('dc.downloaded', state.installed);
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
    state.images
      .filter((image) => image.path === path)
      .forEach((image) => URL.revokeObjectURL(image.url));
    state.images = [
      { path, name, url: URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' })) },
      ...state.images.filter((image) => image.path !== path),
    ];
  } catch (error) {
    console.warn('appendImage failed', error);
  }
}

async function runWorker(action, args) {
  if (!isTauri) {
    showToast(t('This action runs in the desktop app.'), 'warn');
    return false;
  }
  state.workerErrorAt = 0;
  const seenAt = 0;
  try {
    const result = await invoke('run_worker', { action, args });
    state.pythonError = '';
    return result !== false;
  } catch (error) {
    const message = String(error || '').trim();
    const alreadyReported = Date.now() - (state.workerErrorAt || 0) < 5000 && state.workerErrorAt > seenAt;
    state.status = message || t('Generation failed');
    if (/python|module|not found|No module|command|pip/i.test(message)) {
      state.pythonError = message;
    }
    if (alreadyReported) {
      console.warn(message);
    } else if (/worker failed|worker stopped unexpectedly|could not start python/i.test(message)) {
      // The Python side usually reports a friendlier message as a worker event;
      // show the raw wrapper only if that event never arrives.
      const withError = state.workerErrorAt;
      setTimeout(() => {
        if (state.workerErrorAt === withError) showToast(message, 'err');
      }, 900);
    } else {
      showToast(message || t('Generation failed'), 'err');
    }
    render();
    return false;
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
  if (!state.installed[state.model]) {
    showToast(t('Download the selected model first.'), 'warn');
    go('models');
    return;
  }
  state.count = clamp(state.count, 1, 50, 1);
  state.steps = clamp(state.steps, 1, 150, 30);
  state.guidance = clamp(state.guidance, 0, 30, 7.5);
  if (!state.output) await resolvePaths();

  state.job = 'generate';
  state.progress = 0;
  state.status = t('Starting generation…');
  state.pythonError = '';
  startTimer();
  render();

  const ok = await runWorker('generate', {
    prompt: state.prompt,
    negative: state.negative,
    model_path: joinPath(state.modelsDir, folderName(state.model)),
    output: state.output,
    device: state.device,
    count: state.count,
    steps: state.steps,
    guidance: state.guidance,
    width: state.width,
    height: state.height,
    seed: state.seed,
  });

  stopTimer();
  state.job = null;
  state.progress = ok ? 100 : 0;
  state.status = ok ? t('Generation complete') : state.status || t('Generation failed');
  if (ok) {
    await loadImages();
    showToast(t('Generation complete'), 'ok');
  }
  render();
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
  if (state.job) {
    showToast(t('Please wait for the current task to finish.'), 'warn');
    return;
  }
  if (!state.modelsDir) await resolvePaths();
  if (!state.modelsDir) {
    showToast(t('Choose a model folder in Settings first.'), 'err');
    go('settings');
    return;
  }

  state.job = 'download';
  state.progress = 0;
  state.downloading = { id: modelId, percent: 0, bytes: 0, total: 0, speed: 0, file: '', name: modelId };
  state.status = t('Connecting to Hugging Face…');
  state.pythonError = '';
  startTimer();
  render();

  const ok = await runWorker('download', {
    model: modelId,
    path: joinPath(state.modelsDir, folderName(modelId)),
  });

  stopTimer();
  state.job = null;
  state.downloading = null;
  state.progress = 0;

  if (ok) {
    state.installed[modelId] = true;
    state.model = modelId;
    write('dc.model', modelId);
    write('dc.downloaded', state.installed);
    await refreshInstalled();
    state.status = t('Model downloaded and ready');
    showToast(t('Model ready to use'), 'ok');
  } else {
    state.status = t('Download failed');
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
  } catch (error) {
    console.warn('reveal failed', error);
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
    if (key === 'modelsDir') await refreshInstalled();
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

async function recheckHardware() {
  state.hardware = t('Detecting hardware…');
  render();
  const ok = await runWorker('hardware', {});
  if (!ok) state.hardware = t('CPU detected');
  render();
}

function randomPrompt() {
  sync();
  const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  state.prompt = state.lang === 'fa' ? pick.fa : pick.en;
  render();
  document.getElementById('prompt')?.focus();
}

function go(page) {
  sync();
  state.page = page;
  render();
  document.querySelector('.content')?.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setTheme(theme) {
  state.theme = theme;
  write('dc.theme', theme);
  render();
}

function setLang(lang) {
  state.lang = lang;
  write('dc.lang', lang);
  const prompt = document.getElementById('prompt');
  if (prompt) state.prompt = prompt.value;
  render();
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
  'choose-models': () => chooseFolder('modelsDir'),
  'choose-output': () => chooseFolder('output'),
  'open-output': openOutput,
  'copy-prompt': () => (state.images[0] ? copyText(state.meta[state.images[0].name]?.prompt || state.images[0].name, t('Prompt copied')) : null),
  'copy-command': () => copyText('python3 -m pip install -r scripts/requirements.txt', t('Command copied')),
  'download-custom': () => downloadModel(document.getElementById('custom-model')?.value || ''),
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
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') closeLightbox();
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && state.page === 'studio') {
    event.preventDefault();
    if (!state.job) generate();
  }
  const lightbox = document.getElementById('lightbox');
  if (lightbox && state.images.length > 1) {
    if (event.key === 'ArrowLeft') stepLightbox(state.lang === 'fa' ? 1 : -1);
    if (event.key === 'ArrowRight') stepLightbox(state.lang === 'fa' ? -1 : 1);
  }
}

function onWorkerEvent(event) {
  const payload = event.payload || {};
  if (payload.event === 'hardware') {
    state.hardware = payload.cuda && payload.gpu ? payload.gpu : payload.mps ? t('Apple GPU detected') : t('CPU detected');
    render();
  }
  if (payload.event === 'status') {
    state.status = payload.message || state.status;
    paintLive();
  }
  if (payload.event === 'error') {
    state.status = payload.message || 'Worker error';
    state.pythonError = payload.message || '';
    state.workerErrorAt = Date.now();
    showToast(payload.message || 'Worker error', 'err');
    paintLive();
  }
  if (payload.event === 'download') {
    const current = Number(payload.current) || 0;
    const total = Number(payload.total) || 0;
    state.downloading = {
      ...(state.downloading || {}),
      file: payload.name ? String(payload.name).split(/[\\/]/).pop() : state.downloading?.file,
      bytes: current,
      total,
      speed: Number(payload.speed) || 0,
    };
    state.progress = total ? (current / total) * 100 : state.progress;
    paintLive();
  }
  if (payload.event === 'generation') {
    const current = Number(payload.current) || 0;
    const count = Number(payload.count) || 1;
    const step = Number(payload.step) || 0;
    const steps = Number(payload.steps) || state.steps;
    state.progress = Math.min(99, ((current + step / Math.max(1, steps)) / count) * 100);
    state.status = `${t('Images')} ${current + 1} / ${count} · ${t('Steps')} ${step} / ${steps}`;
    paintLive();
  }
  if (payload.event === 'image') {
    if (payload.path) {
      const name = String(payload.path).split(/[\\/]/).pop();
      rememberMeta(name, { prompt: state.prompt, seed: payload.seed, model: state.model });
      appendImage(payload.path).then(() => render());
    }
  }
  if (payload.event === 'complete') {
    state.progress = 100;
    paintLive();
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
  render();

  if (isTauri) {
    await listen('worker-event', onWorkerEvent).catch(() => {});
    await resolvePaths();
    await refreshInstalled();
    await loadImages();
    state.hardware = t('Detecting hardware…');
    render();
    try {
      await invoke('run_worker', { action: 'hardware', args: {} });
    } catch {
      state.hardware = t('Python worker');
      render();
    }
  } else {
    state.hardware = t('Browser preview');
    render();
  }

  refreshCatalog();
}

boot();
