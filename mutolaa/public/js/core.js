// Umumiy yordamchilar: API, holat, ikonlar va qayta ishlatiladigan komponentlar.
export const state = { me: null };
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Internet aloqasini tekshiring');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const num = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
export function dateStr(iso) {
  const d = new Date(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
}
export function ago(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'hozirgina';
  if (m < 60) return `${m} daqiqa oldin`;
  if (m < 60 * 24) return `${Math.floor(m / 60)} soat oldin`;
  if (m < 60 * 24 * 7) return `${Math.floor(m / 1440)} kun oldin`;
  return dateStr(iso);
}

const LEVELS = ['Yangi kitobxon', 'Qiziquvchan', 'Mutolaachi', 'Kitob shaydosi', 'Bilimdon', 'Zukko', 'Donishmand'];
export function level(pages) {
  const step = (n) => 150 * n * n; // n-darajaga yetish uchun jami sahifa
  let n = 0;
  while (n < LEVELS.length - 1 && pages >= step(n + 1)) n++;
  const next = n < LEVELS.length - 1 ? step(n + 1) : null;
  return { n: n + 1, title: LEVELS[n], next, pct: next ? Math.round(((pages - step(n)) / (next - step(n))) * 100) : 100 };
}

// ---------- ikonlar ----------
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M2 5c3.5-1.2 6.5-.8 10 1.5C15.500 4.200 18.500 3.800 22 5v14c-3.500-1.200-6.500-.800-10 1.500C8.500 18.200 5.500 17.800 2 19z"/><path d="M12 6.500v14"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  shelf: '<path d="M4 4v16M9 4v16M4 20h16M13.500 6.500l5 13"/><path d="M4 4h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  pen: '<path d="M4 20h4L19.500 8.500a2.800 2.800 0 0 0-4-4L4 16z"/><path d="m13.500 6.500 4 4"/>',
  heart: '<path d="M12 20.500S3.500 15.500 3.500 9.200A4.700 4.700 0 0 1 12 6.500a4.700 4.700 0 0 1 8.500 2.700c0 6.300-8.500 11.300-8.500 11.300z"/>',
  chat: '<path d="M21 12a8.500 8.500 0 0 1-12.600 7.400L3 21l1.600-5.200A8.500 8.500 0 1 1 21 12z"/>',
  mark: '<path d="M6 3h12v18l-6-4.500L6 21z"/>',
  flame: '<path d="M12 22a7 7 0 0 0 7-7c0-3-1.500-5-3-6.500-.500 2-1.500 3-2.500 3.500C14 8 12.500 4.500 9.500 2c.300 3-1 5-2.500 7S5 12.500 5 15a7 7 0 0 0 7 7z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  moon: '<path d="M20 14.500A8.500 8.500 0 1 1 9.500 4a7 7 0 0 0 10.500 10.500z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.400 1.400M17.600 17.600 19 19M5 19l1.400-1.400M17.600 6.400 19 5"/>',
  check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/>',
  star: '<path d="m12 3 2.700 5.600 6.100.800-4.500 4.300 1.100 6.100L12 16.900 6.600 19.800l1.100-6.100L3.200 9.400l6.100-.800z"/>',
  edit: '<path d="M12 20h9M16.500 3.500a2.100 2.100 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  quote: '<path d="M5 17c2-1 3-3 3-6H4V5h6v6c0 4-2 6-4 7zM15 17c2-1 3-3 3-6h-4V5h6v6c0 4-2 6-4 7z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.500" cy="6" r="1"/><circle cx="4.500" cy="12" r="1"/><circle cx="4.500" cy="18" r="1"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;

// ---------- komponentlar ----------
const initials = (name) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const avatar = (u, size = 36) =>
  `<span class="avatar" style="--h:${u.color};--s:${size}px" aria-hidden="true">${esc(initials(u.name))}</span>`;

export const cover = (b, cls = '') =>
  `<span class="cover ${cls}" style="--h:${b.hue}"><span class="cover-in"><span class="cover-t">${esc(b.title)}</span><span class="cover-a">${esc(b.author)}</span></span></span>`;

export const stars = (value, cls = '') =>
  `<span class="stars ${cls}" aria-label="${value || 0} / 5">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= Math.round(value) ? 'on' : ''}">${icon('star')}</span>`).join('')}</span>`;

export function ring(value, goal, size = 120, label = '') {
  const r = 44, c = 2 * Math.PI * r, pct = Math.min(1, goal ? value / goal : 0);
  return `<div class="ring ${pct >= 1 ? 'done' : ''}" style="--size:${size}px">
    <svg viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="${r}"/>
    <circle class="ring-fg" cx="50" cy="50" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>
    <div class="ring-in"><b>${num(value)}</b><span>${label || `/ ${num(goal)} sahifa`}</span></div></div>`;
}

export function postCard(p) {
  return `<article class="post-card">
    <div class="byline">
      <a href="/u/${esc(p.username)}" class="byline-user">${avatar(p, 28)}<span>${esc(p.name)}</span></a>
      <span class="dot">·</span><time>${ago(p.created_at)}</time>
    </div>
    <a href="/p/${p.id}" class="post-link">
      <div class="post-text">
        <h2>${esc(p.title)}</h2>
        ${p.subtitle ? `<p class="post-sub">${esc(p.subtitle)}</p>` : ''}
        <p class="post-ex">${esc(p.excerpt)}</p>
      </div>
      ${p.book_id ? cover({ title: p.book_title, author: p.book_author, hue: p.book_hue }, 'post-cover') : ''}
    </a>
    <div class="post-foot">
      ${p.book_id ? `<a class="chip" href="/kitob/${p.book_id}">${icon('book')}${esc(p.book_title)}</a>` : ''}
      <span class="muted">${p.read_min} daqiqa</span>
      <span class="grow"></span>
      ${postActions(p)}
    </div>
  </article>`;
}

export const postActions = (p) => `
  <button class="act ${p.liked ? 'on' : ''}" data-act="like" data-id="${p.id}" aria-label="Yoqtirish" aria-pressed="${!!p.liked}">${icon('heart')}<span>${p.likes}</span></button>
  <a class="act" href="/p/${p.id}#izohlar" aria-label="Izohlar">${icon('chat')}<span>${p.comments}</span></a>
  <button class="act mark ${p.saved ? 'on' : ''}" data-act="save" data-id="${p.id}" aria-label="Saqlash" aria-pressed="${!!p.saved}">${icon('mark')}</button>`;

export const empty = (ic, title, text, action = '') =>
  `<div class="empty">${icon(ic)}<h3>${title}</h3><p>${text}</p>${action}</div>`;

export const skeleton = (n = 3) =>
  Array.from({ length: n }, () => `<div class="skel"><i style="width:30%"></i><i style="width:80%;height:22px"></i><i></i><i style="width:60%"></i></div>`).join('');

export function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.classList.add('hide'), 3200);
  setTimeout(() => el.remove(), 3600);
}

let lastFocus = null;
export function modal(html, { wide = false } = {}) {
  lastFocus = document.activeElement;
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay" data-act="close-modal"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <button class="icon-btn modal-x" data-act="close-modal" aria-label="Yopish">${icon('x')}</button>${html}</div></div>`;
  document.body.classList.add('locked');
  const first = $('input,textarea,select,button:not(.modal-x)', root);
  first?.focus();
  return $('.modal', root);
}
export function closeModal() {
  $('#modal-root').innerHTML = '';
  document.body.classList.remove('locked');
  lastFocus?.focus?.();
}

// ---------- navigatsiya va global amallar (app.js toʻldiradi) ----------
export const nav = { go: null, refresh: null, rail: null };
export const actions = {};
export function needAuth() {
  if (state.me) return true;
  toast('Davom etish uchun tizimga kiring');
  nav.go('/kirish?next=' + encodeURIComponent(location.pathname));
  return false;
}
