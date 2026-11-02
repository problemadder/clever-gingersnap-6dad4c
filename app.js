'use strict';

/* dinaplana – family dinner tracker.
 * Data lives in localStorage ("dinner-meals", "dinner-plan" – same keys and shapes as v1)
 * plus IndexedDB for meal photos, so photos never bloat localStorage. */

const APP_VERSION = '2.0';
const KEYS = { meals: 'dinner-meals', plan: 'dinner-plan', settings: 'dinner-settings', shop: 'dinner-shopping' };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ---------- icons (lucide, ISC) ---------- */
const ICONS = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/><circle cx="8.5" cy="15.5" r="1"/><circle cx="12" cy="12" r="1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
};
const icon = (n, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function weekStart(d, startDay) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() - startDay + 7) % 7));
}
function daysSince(iso) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
}
function agoText(iso) {
  const d = daysSince(iso);
  if (d === Infinity) return 'never';
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('save failed', key, e); toast('Could not save – storage full?'); }
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
const lines = s => String(s || '').split('\n').map(l => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);

/* ---------- photo storage (IndexedDB) ---------- */
const photoDB = (() => {
  let dbp;
  const open = () => dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('dinaplana', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('photos', mode);
      const out = fn(t.objectStore('photos'));
      t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: id => tx('readonly', s => s.get(String(id))),
    put: (id, blob) => tx('readwrite', s => s.put(blob, String(id))),
    del: id => tx('readwrite', s => s.delete(String(id))),
    clear: () => tx('readwrite', s => s.clear()),
    async all() {
      const db = await open();
      return new Promise((res, rej) => {
        const out = {};
        const req = db.transaction('photos').objectStore('photos').openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
        req.onerror = () => rej(req.error);
      });
    },
  };
})();

const photoURLs = new Map(); // meal id -> object URL
function setPhotoURL(id, blob) {
  const k = String(id);
  if (photoURLs.has(k)) URL.revokeObjectURL(photoURLs.get(k));
  if (blob) photoURLs.set(k, URL.createObjectURL(blob)); else photoURLs.delete(k);
}
const photoURL = id => photoURLs.get(String(id));

/** Downscale a camera photo to a sensible size (≈100–250 KB) before storing it. */
async function compressImage(file, max = 1280, quality = 0.82) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Not an image'));
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return new Promise(res => c.toBlob(res, 'image/jpeg', quality));
}
const blobToDataURL = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const dataURLToBlob = async u => (await fetch(u)).blob();

/* ---------- state ---------- */
const state = {
  view: 'meals',
  meals: load(KEYS.meals, []),
  plan: load(KEYS.plan, {}),
  settings: { weekStart: 0, sort: 'recent', ...load(KEYS.settings, {}) },
  shop: load(KEYS.shop, {}),          // { "<week>|<item>": true }
  query: '',
  tag: '',
  weekOffset: 0,
  sheet: null,                         // { type: 'detail'|'edit', id }
  draft: null,                         // editor draft
  pick: null,                          // planner meal picker: { q, tag }
};
const persist = {
  meals: () => save(KEYS.meals, state.meals),
  plan: () => save(KEYS.plan, state.plan),
  settings: () => save(KEYS.settings, state.settings),
  shop: () => save(KEYS.shop, state.shop),
};
const mealById = id => state.meals.find(m => String(m.id) === String(id));
const currentWeekStart = () => addDays(weekStart(new Date(), state.settings.weekStart), state.weekOffset * 7);
const weekDays = () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart(), i));
/** Plan entries are meal snapshots (v1 format); prefer the live meal so edits show up. */
const plannedMeal = key => { const p = state.plan[key]; return p ? (mealById(p.id) || p) : null; };

function allTags() {
  const s = new Set();
  state.meals.forEach(m => (m.tags || []).forEach(t => s.add(t)));
  return [...s].sort((a, b) => a.localeCompare(b));
}
function filteredMeals() {
  const q = state.query.trim().toLowerCase();
  const list = state.meals.filter(m => {
    const hay = [m.name, m.description, m.ingredients, (m.tags || []).join(' ')].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (!state.tag || (m.tags || []).includes(state.tag));
  });
  const by = {
    recent: (a, b) => new Date(b.lastEaten || 0) - new Date(a.lastEaten || 0),
    oldest: (a, b) => new Date(a.lastEaten || 0) - new Date(b.lastEaten || 0),
    rating: (a, b) => b.rating - a.rating || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
  }[state.settings.sort] || (() => 0);
  return list.sort(by);
}

/* ---------- rendering ---------- */
const app = $('#app');

function render() {
  const tabs = [
    ['meals', 'book', 'Meals'],
    ['planner', 'calendar', 'Planner'],
    ['shopping', 'cart', 'Shopping'],
    ['settings', 'sliders', 'Settings'],
  ];
  const body = { meals: viewMeals, planner: viewPlanner, shopping: viewShopping, settings: viewSettings }[state.view]();
  app.innerHTML = `
    <div class="wrap">
      <header class="header"><h1>dina<span>plana</span></h1>
        ${state.view === 'meals' ? `<button class="btn primary" data-action="new">${icon('plus')} Add meal</button>` : ''}
      </header>
      ${body}
    </div>
    <nav class="tabs">${tabs.map(([v, i, l]) =>
      `<button class="tab ${state.view === v ? 'on' : ''}" data-action="view" data-v="${v}">${icon(i, 'lg')}${l}</button>`).join('')}
    </nav>`;
}

function mealCard(m) {
  const url = photoURL(m.id);
  return `<button class="meal" data-action="open" data-id="${m.id}">
    <div class="ph">${url ? `<img src="${url}" alt="" loading="lazy">` : '🍽️'}</div>
    <div class="body">
      <h3>${esc(m.name)}</h3>
      <div class="meta"><span class="stars" aria-label="${m.rating} of 5">${stars(m.rating)}</span><span>${agoText(m.lastEaten)}</span></div>
      ${(m.tags || []).length ? `<div class="chips">${m.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    </div></button>`;
}

function viewMeals() {
  const tags = allTags();
  return `<div class="stack">
    <div class="card stack">
      <div class="row">
        <div class="searchbar">${icon('search')}<input class="field" type="search" id="q" placeholder="Search name, ingredient, recipe…" value="${esc(state.query)}"></div>
        <select class="field" id="sort" style="flex:1 1 150px;width:auto" aria-label="Sort">
          ${[['recent', 'Recently cooked'], ['oldest', 'Not had in a while'], ['rating', 'Best rated'], ['name', 'A–Z']]
            .map(([v, l]) => `<option value="${v}" ${state.settings.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      ${tags.length ? `<div class="chips">${tags.map(t =>
        `<button class="chip ${state.tag === t ? 'on' : ''}" data-action="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    </div>
    <div id="list">${listHTML()}</div>
  </div>`;
}
function listHTML() {
  const list = filteredMeals();
  if (!state.meals.length) return `<div class="card empty">No meals yet.<br><br><button class="btn primary" data-action="new">${icon('plus')} Add your first meal</button></div>`;
  if (!list.length) return `<div class="card empty">No meals match. <button class="btn" data-action="clear-filters">Clear filters</button></div>`;
  return `<p class="muted small" style="margin:0 0 8px">${list.length} of ${state.meals.length} meals</p><div class="meals">${list.map(mealCard).join('')}</div>`;
}

function viewPlanner() {
  const days = weekDays();
  const today = dateKey(new Date());
  return `<div class="stack">
    <div class="card weeknav">
      <button class="btn icon-only" data-action="week" data-d="-1" aria-label="Previous week">${icon('left')}</button>
      <div style="text-align:center"><b>${days[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</b>
        ${state.weekOffset ? `<br><button class="chip" data-action="week" data-d="0">Back to this week</button>` : ''}</div>
      <button class="btn icon-only" data-action="week" data-d="1" aria-label="Next week">${icon('right')}</button>
    </div>
    <div class="toolbar">
      <button class="btn" data-action="fill-week" ${state.meals.length ? '' : 'disabled'}>${icon('dice')} Fill empty days</button>
      <button class="btn" data-action="share-week">${icon('share')} Share</button>
      <button class="btn" data-action="print-week">${icon('printer')} Print</button>
    </div>
    ${days.map(d => {
      const k = dateKey(d);
      const m = plannedMeal(k);
      const url = m && photoURL(m.id);
      return `<div class="day ${k === today ? 'today' : ''}">
        <div class="dname"><b>${DAY_NAMES[d.getDay()].slice(0, 3)}</b><span class="muted small">${d.getDate()}.${d.getMonth() + 1}.</span></div>
        ${m ? `<button class="planned" data-action="open" data-id="${m.id}">
                ${url ? `<img src="${url}" alt="">` : '<span class="noimg">🍽️</span>'}
                <span class="grow"><span class="nm" style="display:block">${esc(m.name)}</span><span class="muted small">${stars(m.rating)}</span></span>
              </button>
              <button class="btn icon-only" data-action="unplan" data-k="${k}" aria-label="Remove">${icon('x')}</button>`
            : `<button class="field pick-btn" data-action="pick" data-k="${k}" ${state.meals.length ? '' : 'disabled'}>${icon('plus')} ${state.meals.length ? 'Choose a meal' : 'Add meals first'}</button>
               <button class="btn icon-only" data-action="suggest" data-k="${k}" aria-label="Suggest a meal" title="Surprise me" ${state.meals.length ? '' : 'disabled'}>${icon('dice')}</button>`}
      </div>`;
    }).join('')}
  </div>`;
}

/** Ingredients of the visible week, merged by name (case-insensitive), with the meals they're for. */
function shoppingItems() {
  const items = new Map();
  weekDays().forEach(d => {
    const m = plannedMeal(dateKey(d));
    if (!m) return;
    lines(m.ingredients).forEach(line => {
      const key = line.toLowerCase();
      if (!items.has(key)) items.set(key, { text: line, meals: new Map() });
      const ms = items.get(key).meals;
      ms.set(m.name, (ms.get(m.name) || 0) + 1);
    });
  });
  return [...items.entries()].map(([key, v]) => ({
    key, text: v.text, meals: [...v.meals].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)),
  }));
}
const shopKey = item => `${dateKey(currentWeekStart())}|${item.key}`;

function viewShopping() {
  const items = shoppingItems();
  const days = weekDays();
  const missing = days.map(d => plannedMeal(dateKey(d))).filter(m => m && !lines(m.ingredients).length);
  return `<div class="stack">
    <div class="card weeknav">
      <button class="btn icon-only" data-action="week" data-d="-1" aria-label="Previous week">${icon('left')}</button>
      <b>Shopping · week of ${days[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</b>
      <button class="btn icon-only" data-action="week" data-d="1" aria-label="Next week">${icon('right')}</button>
    </div>
    ${items.length ? `<div class="toolbar">
      <button class="btn" data-action="share-shop">${icon('share')} Share list</button>
      <button class="btn" data-action="print-shop">${icon('printer')} Print</button>
      <button class="btn" data-action="uncheck-shop">Uncheck all</button></div>
    <div class="card shop"><ul>${items.map(it => {
      const done = !!state.shop[shopKey(it)];
      return `<li class="${done ? 'done' : ''}"><input type="checkbox" id="s-${esc(it.key)}" data-shop="${esc(it.key)}" ${done ? 'checked' : ''}>
        <label class="grow" for="s-${esc(it.key)}"><span>${esc(it.text)}</span><br><span class="muted small">${esc(it.meals.join(', '))}</span></label></li>`;
    }).join('')}</ul></div>`
    : `<div class="card empty">Nothing to buy yet.<br><span class="small">Plan meals for this week and add ingredients to them – they'll be collected here.</span></div>`}
    ${missing.length ? `<p class="muted small">No ingredients saved for: ${missing.map(m => `<button class="chip" data-action="edit" data-id="${m.id}">${esc(m.name)}</button>`).join(' ')}</p>` : ''}
  </div>`;
}

function viewSettings() {
  const planned = Object.keys(state.plan).length;
  const photos = photoURLs.size;
  return `<div class="stack">
    <div class="card stack">
      <h2>Preferences</h2>
      <label class="row"><span class="grow">Week starts on</span>
        <select class="field" id="weekstart" style="width:auto">
          <option value="1" ${state.settings.weekStart === 1 ? 'selected' : ''}>Monday</option>
          <option value="0" ${state.settings.weekStart === 0 ? 'selected' : ''}>Sunday</option>
        </select></label>
    </div>
    <div class="card stack">
      <h2>Backup & restore</h2>
      <p class="muted small" style="margin:0">Everything lives only on this device. Download a backup now and then – it can also move your meals to another phone.</p>
      <label class="row small"><input type="checkbox" id="incl-photos" checked> Include photos (bigger file)</label>
      <button class="btn primary block" data-action="backup">${icon('download')} Download backup</button>
      <label class="btn block">${icon('upload')} Restore from backup<input type="file" accept=".json,application/json" id="restore" hidden></label>
    </div>
    <div class="card stack">
      <h2>Stats</h2>
      <p style="margin:0">${state.meals.length} meals · ${photos} photos · ${planned} planned dinners</p>
      ${topMeals()}
    </div>
    <div class="card stack" style="border:1px solid var(--danger)">
      <h2 style="color:var(--danger)">Danger zone</h2>
      <p class="muted small" style="margin:0">Delete all meals, photos and plans from this device.</p>
      <button class="btn danger block" data-action="reset">${icon('trash')} Reset app</button>
    </div>
    <p class="muted small" style="text-align:center">dinaplana ${APP_VERSION} · works offline · install via “Add to Home Screen”</p>
  </div>`;
}
function topMeals() {
  const top = [...state.meals].filter(m => m.timesCooked).sort((a, b) => b.timesCooked - a.timesCooked).slice(0, 5);
  return top.length ? `<div><b class="small">Most cooked</b><ol class="small" style="margin:4px 0 0;padding-left:20px">${top.map(m => `<li>${esc(m.name)} – ${m.timesCooked}×</li>`).join('')}</ol></div>` : '';
}

/* ---------- sheets ---------- */
const sheetRoot = $('#sheet-root');

function openSheet(sheet) {
  if (!state.sheet) history.pushState({ sheet: true }, '');
  state.sheet = sheet;
  renderSheet();
}
function closeSheet(fromPop = false) {
  if (!state.sheet) return;
  state.sheet = null;
  state.draft = null;
  state.pick = null;
  releaseWakeLock();
  sheetRoot.innerHTML = '';
  document.body.style.overflow = '';
  if (!fromPop && history.state?.sheet) history.back();
}
addEventListener('popstate', () => closeSheet(true));

function renderSheet() {
  const s = state.sheet;
  if (!s) return;
  document.body.style.overflow = 'hidden';
  sheetRoot.innerHTML = `<div class="sheet-backdrop" data-action="backdrop"><div class="sheet" role="dialog" aria-modal="true">
    ${s.type === 'detail' ? detailHTML(mealById(s.id)) : s.type === 'pick' ? pickHTML(s.key) : editHTML()}</div></div>`;
  if (s.type === 'edit') $('#e-name')?.focus({ preventScroll: true });
}

function detailHTML(m) {
  if (!m) return '';
  const url = photoURL(m.id);
  const ing = lines(m.ingredients);
  return `
    <div class="top"><button class="btn icon-only" data-action="close" aria-label="Close">${icon('x')}</button></div>
    ${url ? `<img class="hero" src="${url}" alt="${esc(m.name)}">` : '<div style="height:52px"></div>'}
    <div class="inner stack">
      <div>
        <h2 style="font-size:1.4rem;margin:0">${esc(m.name)}</h2>
        <div class="muted small"><span class="stars">${stars(m.rating)}</span> · last cooked ${agoText(m.lastEaten)}${m.timesCooked ? ` · cooked ${m.timesCooked}×` : ''}</div>
      </div>
      ${(m.tags || []).length ? `<div class="chips">${m.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="actions">
        <button class="btn primary" data-action="cooked" data-id="${m.id}">${icon('check')} Cooked today</button>
        <button class="btn" data-action="share-meal" data-id="${m.id}">${icon('share')} Share</button>
        <button class="btn" data-action="print-meal" data-id="${m.id}">${icon('printer')} Print</button>
        <button class="btn" data-action="edit" data-id="${m.id}">${icon('pencil')} Edit</button>
      </div>
      ${ing.length ? `<div><h3>Ingredients</h3><ul class="ing">${ing.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}
      ${m.description ? `<div><h3>Recipe</h3><div class="pre">${esc(m.description)}</div></div>` : ''}
      ${m.notes ? `<div><h3>Notes</h3><div class="pre muted"><i>${esc(m.notes)}</i></div></div>` : ''}
      ${!ing.length && !m.description ? `<p class="muted small">No recipe yet – tap Edit to add ingredients and steps.</p>` : ''}
      ${'wakeLock' in navigator ? `<label class="row small muted"><input type="checkbox" id="wake"> Keep screen on while cooking</label>` : ''}
      <button class="btn danger" data-action="delete" data-id="${m.id}">${icon('trash')} Delete meal</button>
    </div>`;
}

/* Planner meal picker: searchable list instead of one long dropdown.
 * Meals not had for the longest come first; ones already planned this week go last. */
function pickHTML(key) {
  const [y, mo, d] = key.split('-').map(Number);
  const day = new Date(y, mo - 1, d);
  const tags = allTags();
  return `
    <div class="pick-head">
      <div class="row"><h2 class="grow" style="margin:0">Dinner for ${DAY_NAMES[day.getDay()]} <span class="muted">${d}.${mo}.</span></h2>
        <button class="btn icon-only" data-action="close" aria-label="Close">${icon('x')}</button></div>
      <div class="row">
        <div class="searchbar">${icon('search')}<input class="field" type="search" id="pick-q" placeholder="Search meals…" value="${esc(state.pick.q)}" enterkeyhint="search"></div>
        <button class="btn" data-action="pick-random">${icon('dice')} Surprise me</button>
      </div>
      ${tags.length ? `<div class="chips scroll-x">${tags.map(t =>
        `<button class="chip ${state.pick.tag === t ? 'on' : ''}" data-action="pick-tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    </div>
    <div id="pick-list" class="pick-list">${pickListHTML()}</div>`;
}
function pickListHTML() {
  const q = state.pick.q.trim().toLowerCase();
  const thisWeek = new Set(weekDays().map(d => state.plan[dateKey(d)]?.id).filter(id => id != null).map(String));
  const list = state.meals
    .filter(m => (!q || [m.name, m.ingredients, (m.tags || []).join(' ')].join(' ').toLowerCase().includes(q))
      && (!state.pick.tag || (m.tags || []).includes(state.pick.tag)))
    .sort((a, b) => thisWeek.has(String(a.id)) - thisWeek.has(String(b.id))
      || new Date(a.lastEaten || 0) - new Date(b.lastEaten || 0));
  if (!list.length) return `<p class="empty">No meals match.</p>`;
  return list.map(m => {
    const url = photoURL(m.id);
    const planned = thisWeek.has(String(m.id));
    return `<button class="pick-item" data-action="pick-meal" data-id="${m.id}">
      ${url ? `<img src="${url}" alt="" loading="lazy">` : '<span class="noimg">🍽️</span>'}
      <span class="grow"><span class="nm">${esc(m.name)}</span>
        <span class="muted small"><span class="stars">${stars(m.rating)}</span> · ${planned ? '<b>planned this week</b>' : `last ${agoText(m.lastEaten)}`}</span></span>
    </button>`;
  }).join('');
}

function startEdit(id) {
  const m = id != null ? mealById(id) : null;
  state.draft = {
    id: m?.id ?? null,
    name: m?.name || '',
    rating: m?.rating || 4,
    ingredients: m?.ingredients || '',
    description: m?.description || '',
    notes: m?.notes || '',
    tags: (m?.tags || []).join(', '),
    photo: undefined,          // undefined = unchanged, null = removed, Blob = new
    photoPreview: m ? photoURL(m.id) : null,
  };
  openSheet({ type: 'edit', id });
}

function editHTML() {
  const d = state.draft;
  return `
    <div class="inner stack">
      <div class="row"><h2 class="grow" style="margin:0">${d.id != null ? 'Edit meal' : 'New meal'}</h2>
        <button class="btn icon-only" data-action="close" aria-label="Close">${icon('x')}</button></div>
      <div><label class="lbl" for="e-name">Name *</label><input class="field" id="e-name" data-draft="name" value="${esc(d.name)}" placeholder="e.g. Lasagne"></div>
      <div><span class="lbl">Photo</span>
        <div class="photo-edit">
          ${d.photoPreview ? `<img class="thumb" src="${d.photoPreview}" alt="">` : `<div class="thumb">${icon('image', 'lg')}</div>`}
          <div class="row">
            <label class="btn">${icon('camera')} ${d.photoPreview ? 'Change' : 'Add photo'}<input type="file" accept="image/*" id="e-photo" hidden></label>
            ${d.photoPreview ? `<button class="btn danger icon-only" data-action="remove-photo" aria-label="Remove photo">${icon('trash')}</button>` : ''}
          </div>
        </div></div>
      <div><span class="lbl">Rating</span><div class="rating-input">${[1, 2, 3, 4, 5].map(n =>
        `<button class="${n <= d.rating ? 'on' : ''}" data-action="rate" data-n="${n}" aria-label="${n} stars">★</button>`).join('')}</div></div>
      <div><label class="lbl" for="e-ing">Ingredients <span class="muted">(one per line – used for the shopping list)</span></label>
        <textarea class="field" id="e-ing" data-draft="ingredients" rows="5" placeholder="500 g minced beef&#10;1 onion&#10;lasagne sheets">${esc(d.ingredients)}</textarea></div>
      <div><label class="lbl" for="e-desc">Recipe / description</label><textarea class="field" id="e-desc" data-draft="description" rows="5">${esc(d.description)}</textarea></div>
      <div><label class="lbl" for="e-notes">Notes</label><textarea class="field" id="e-notes" data-draft="notes" rows="2" placeholder="Kids love it with extra cheese">${esc(d.notes)}</textarea></div>
      <div><label class="lbl" for="e-tags">Tags <span class="muted">(comma separated)</span></label><input class="field" id="e-tags" data-draft="tags" value="${esc(d.tags)}" placeholder="pasta, quick, vegetarian" list="tag-list">
        <datalist id="tag-list">${allTags().map(t => `<option value="${esc(t)}">`).join('')}</datalist></div>
      <div class="row"><button class="btn primary grow" data-action="save">${icon('check')} Save</button><button class="btn" data-action="close">Cancel</button></div>
    </div>`;
}

async function saveDraft() {
  const d = state.draft;
  if (!d.name.trim()) { toast('Please give the meal a name'); $('#e-name')?.focus(); return; }
  const old = d.id != null ? mealById(d.id) : null;
  const meal = {
    ...old,
    id: old?.id ?? Date.now(),
    name: d.name.trim(),
    description: d.description,
    ingredients: d.ingredients,
    rating: d.rating,
    notes: d.notes,
    tags: d.tags.split(',').map(t => t.trim()).filter(Boolean),
    dateAdded: old?.dateAdded || new Date().toISOString(),
    lastEaten: old?.lastEaten || new Date().toISOString(),
  };
  try {
    if (d.photo instanceof Blob) { await photoDB.put(meal.id, d.photo); setPhotoURL(meal.id, d.photo); }
    else if (d.photo === null) { await photoDB.del(meal.id); setPhotoURL(meal.id, null); }
  } catch (e) { console.error(e); toast('Photo could not be saved'); }
  state.meals = old ? state.meals.map(m => (m.id === old.id ? meal : m)) : [...state.meals, meal];
  persist.meals();
  render();
  state.sheet = { type: 'detail', id: meal.id };
  state.draft = null;
  renderSheet();
  toast(old ? 'Saved' : 'Meal added');
}

/* ---------- wake lock (cook mode) ---------- */
let wakeLock = null;
async function setWakeLock(on) {
  try {
    if (on) wakeLock = await navigator.wakeLock.request('screen');
    else releaseWakeLock();
  } catch { toast('Screen lock not available'); }
}
function releaseWakeLock() { wakeLock?.release().catch(() => {}); wakeLock = null; }

/* ---------- share ---------- */
function mealText(m) {
  const ing = lines(m.ingredients);
  return [
    `🍽️ ${m.name}`,
    `${stars(m.rating)}`,
    ing.length ? `\nIngredients:\n${ing.map(i => `• ${i}`).join('\n')}` : '',
    m.description ? `\nRecipe:\n${m.description}` : '',
    m.notes ? `\nNotes: ${m.notes}` : '',
  ].filter(Boolean).join('\n');
}
async function share({ title, text, files }) {
  if (navigator.share) {
    const withFiles = files?.length && navigator.canShare?.({ files }) ? { files } : {};
    try { await navigator.share({ title, text, ...withFiles }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch { toast('Sharing not supported here'); }
}
async function shareMeal(m) {
  const blob = await photoDB.get(m.id).catch(() => null);
  const files = blob ? [new File([blob], `${m.name.replace(/[^\w-]+/g, '_')}.jpg`, { type: blob.type || 'image/jpeg' })] : [];
  share({ title: m.name, text: mealText(m), files });
}
function weekText() {
  return `🗓️ Dinners, week of ${currentWeekStart().toLocaleDateString()}\n\n` + weekDays().map(d => {
    const m = plannedMeal(dateKey(d));
    return `${DAY_NAMES[d.getDay()]}: ${m ? m.name : '–'}`;
  }).join('\n');
}
function shopText() {
  return `🛒 Shopping list\n\n` + shoppingItems().filter(it => !state.shop[shopKey(it)]).map(it => `☐ ${it.text}`).join('\n');
}

/* ---------- print ---------- */
function printHTML(html) {
  const area = $('#print-area');
  area.innerHTML = html;
  const imgs = [...area.querySelectorAll('img')];
  Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => {
    window.print();
  });
}
function mealPrintHTML(m, withPhoto = true) {
  const url = photoURL(m.id);
  const ing = lines(m.ingredients);
  return `<article style="break-inside:avoid-page">
    <h1>${esc(m.name)}</h1>
    <div class="meta">${stars(m.rating)}${(m.tags || []).length ? ' · ' + esc(m.tags.join(', ')) : ''}</div>
    ${withPhoto && url ? `<img src="${url}" alt="">` : ''}
    ${ing.length ? `<h2>Ingredients</h2><ul>${ing.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
    ${m.description ? `<h2>Recipe</h2><div style="white-space:pre-wrap">${esc(m.description)}</div>` : ''}
    ${m.notes ? `<h2>Notes</h2><div style="white-space:pre-wrap"><i>${esc(m.notes)}</i></div>` : ''}
  </article>`;
}
function printWeek() {
  const days = weekDays();
  const rows = days.map(d => {
    const m = plannedMeal(dateKey(d));
    return `<tr><td style="width:30%"><b>${DAY_NAMES[d.getDay()]}</b><br><span class="meta">${d.toLocaleDateString()}</span></td><td>${m ? esc(m.name) : ''}</td></tr>`;
  }).join('');
  const items = shoppingItems();
  printHTML(`<h1>Dinner plan</h1><div class="meta">Week of ${days[0].toLocaleDateString()}</div>
    <table style="margin-top:12pt">${rows}</table>
    ${items.length ? `<h2>Shopping list</h2><ul class="check">${items.map(i => `<li><span class="box"></span>${esc(i.text)}</li>`).join('')}</ul>` : ''}`);
}
function printShop() {
  printHTML(`<h1>Shopping list</h1><div class="meta">Week of ${currentWeekStart().toLocaleDateString()}</div>
    <ul class="check" style="margin-top:12pt">${shoppingItems().filter(it => !state.shop[shopKey(it)]).map(i => `<li><span class="box"></span>${esc(i.text)}</li>`).join('')}</ul>`);
}

/* ---------- planner helpers ---------- */
function planMeal(key, meal) {
  state.plan = { ...state.plan, [key]: meal };
  persist.plan();
}
/** Weighted random pick: higher rating and "longer since last time" are more likely;
 *  only meals planned the fewest times this week are candidates, so repeats are spread out. */
function suggestMeal() {
  const used = {};
  weekDays().forEach(d => { const id = state.plan[dateKey(d)]?.id; if (id != null) used[id] = (used[id] || 0) + 1; });
  const least = Math.min(...state.meals.map(m => used[m.id] || 0));
  const pool = state.meals.filter(m => (used[m.id] || 0) === least);
  const weights = pool.map(m => (m.rating ** 2) * (Math.min(daysSince(m.lastEaten), 60) + 3));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  return pool.find((_, i) => (r -= weights[i]) <= 0) || pool[0];
}

/* ---------- backup ---------- */
async function downloadBackup() {
  const data = { meals: state.meals, weekPlan: state.plan, settings: state.settings, exportDate: new Date().toISOString(), version: APP_VERSION };
  if ($('#incl-photos')?.checked) {
    const all = await photoDB.all();
    data.photos = {};
    for (const [id, blob] of Object.entries(all)) data.photos[id] = await blobToDataURL(blob);
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `family-dinners-backup-${dateKey(new Date())}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function restoreBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.meals)) throw new Error('no meals');
    if (!confirm(`Replace your current data with this backup (${data.meals.length} meals)?`)) return;
    state.meals = data.meals;
    if (data.weekPlan && typeof data.weekPlan === 'object') state.plan = data.weekPlan;
    if (data.settings) state.settings = { ...state.settings, ...data.settings };
    persist.meals(); persist.plan(); persist.settings();
    if (data.photos) {
      for (const [id, url] of Object.entries(data.photos)) {
        const blob = await dataURLToBlob(url);
        await photoDB.put(id, blob);
        setPhotoURL(id, blob);
      }
    }
    render();
    toast('Backup restored');
  } catch (e) {
    console.error(e);
    alert("That doesn't look like a valid backup file.");
  }
}
async function resetApp() {
  if (!confirm('Delete ALL meals, photos and plans? This cannot be undone.')) return;
  if (!confirm('Last chance! Consider downloading a backup first. Really reset?')) return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  await photoDB.clear().catch(() => {});
  photoURLs.forEach(u => URL.revokeObjectURL(u));
  photoURLs.clear();
  Object.assign(state, { meals: [], plan: {}, shop: {}, settings: { weekStart: state.settings.weekStart, sort: 'recent' } });
  render();
  toast('App has been reset');
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;
  const m = id != null ? mealById(id) : null;
  switch (action) {
    case 'view': state.view = el.dataset.v; render(); scrollTo(0, 0); break;
    case 'new': startEdit(null); break;
    case 'open': openSheet({ type: 'detail', id }); break;
    case 'edit': startEdit(id); break;
    case 'close': closeSheet(); break;
    case 'backdrop': if (e.target === el) closeSheet(); break;
    case 'tag': state.tag = state.tag === el.dataset.tag ? '' : el.dataset.tag; render(); break;
    case 'clear-filters': state.query = ''; state.tag = ''; render(); break;
    case 'rate': state.draft.rating = +el.dataset.n; renderSheet(); break;
    case 'remove-photo': state.draft.photo = null; state.draft.photoPreview = null; renderSheet(); break;
    case 'save': saveDraft(); break;
    case 'delete':
      if (m && confirm(`Delete “${m.name}”?`)) {
        state.meals = state.meals.filter(x => x !== m);
        persist.meals();
        photoDB.del(m.id).catch(() => {}); setPhotoURL(m.id, null);
        closeSheet(); render(); toast('Meal deleted');
      }
      break;
    case 'cooked':
      if (m) {
        const upd = { ...m, lastEaten: new Date().toISOString(), timesCooked: (m.timesCooked || 0) + 1 };
        state.meals = state.meals.map(x => (x === m ? upd : x));
        persist.meals(); render(); renderSheet(); toast('Enjoy! 🍽️');
      }
      break;
    case 'share-meal': if (m) shareMeal(m); break;
    case 'print-meal': if (m) printHTML(mealPrintHTML(m)); break;
    case 'week': state.weekOffset = el.dataset.d === '0' ? 0 : state.weekOffset + +el.dataset.d; render(); break;
    case 'unplan': { const p = { ...state.plan }; delete p[el.dataset.k]; state.plan = p; persist.plan(); render(); break; }
    case 'suggest': planMeal(el.dataset.k, suggestMeal()); render(); break;
    case 'pick': state.pick = { q: '', tag: '' }; openSheet({ type: 'pick', key: el.dataset.k }); break;
    case 'pick-tag':
      state.pick.tag = state.pick.tag === el.dataset.tag ? '' : el.dataset.tag;
      $('#pick-list').innerHTML = pickListHTML();
      document.querySelectorAll('[data-action=pick-tag]').forEach(c => c.classList.toggle('on', c.dataset.tag === state.pick.tag));
      break;
    case 'pick-meal':
    case 'pick-random': {
      const key = state.sheet.key;
      planMeal(key, action === 'pick-random' ? suggestMeal() : m);
      closeSheet(); render();
      break;
    }
    case 'fill-week': {
      let n = 0;
      weekDays().forEach(d => { const k = dateKey(d); if (!state.plan[k]) { planMeal(k, suggestMeal()); n++; } });
      render(); toast(n ? `Planned ${n} dinner${n > 1 ? 's' : ''}` : 'Week is already full');
      break;
    }
    case 'share-week': share({ title: 'Dinner plan', text: weekText() }); break;
    case 'print-week': printWeek(); break;
    case 'share-shop': share({ title: 'Shopping list', text: shopText() }); break;
    case 'print-shop': printShop(); break;
    case 'uncheck-shop': {
      const prefix = dateKey(currentWeekStart()) + '|';
      Object.keys(state.shop).forEach(k => k.startsWith(prefix) && delete state.shop[k]);
      persist.shop(); render(); break;
    }
    case 'backup': downloadBackup(); break;
    case 'reset': resetApp(); break;
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { state.query = t.value; $('#list').innerHTML = listHTML(); }
  else if (t.id === 'pick-q' && state.pick) { state.pick.q = t.value; $('#pick-list').innerHTML = pickListHTML(); }
  else if (t.dataset.draft && state.draft) state.draft[t.dataset.draft] = t.value;
});

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'sort') { state.settings.sort = t.value; persist.settings(); $('#list').innerHTML = listHTML(); }
  else if (t.id === 'weekstart') { state.settings.weekStart = +t.value; persist.settings(); toast('Saved'); }
  else if (t.dataset.shop != null) {
    const k = `${dateKey(currentWeekStart())}|${t.dataset.shop}`;
    if (t.checked) state.shop[k] = true; else delete state.shop[k];
    persist.shop();
    t.closest('li').classList.toggle('done', t.checked);
  } else if (t.id === 'e-photo' && t.files[0]) {
    try {
      const blob = await compressImage(t.files[0]);
      if (state.draft.photoPreview?.startsWith('blob:') && state.draft.photo instanceof Blob) URL.revokeObjectURL(state.draft.photoPreview);
      state.draft.photo = blob;
      state.draft.photoPreview = URL.createObjectURL(blob);
      renderSheet();
    } catch { toast('Could not read that image'); }
  } else if (t.id === 'wake') setWakeLock(t.checked);
  else if (t.id === 'restore' && t.files[0]) { await restoreBackup(t.files[0]); t.value = ''; }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.sheet) closeSheet();
  if (e.key === 'Enter' && e.target.id === 'e-name') saveDraft();
});

/* ---------- boot ---------- */
(async function boot() {
  render();
  try {
    const all = await photoDB.all();
    Object.entries(all).forEach(([id, blob]) => setPhotoURL(id, blob));
    if (photoURLs.size) render();
  } catch (e) { console.warn('Photos unavailable', e); }
  navigator.storage?.persist?.();      // ask the browser not to evict our data
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // A new version took over: reload once so it's used right away (not when an editor is open).
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !state.draft) location.reload();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  }
})();
