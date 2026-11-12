import { state, $, $$, api, esc, num, icon, avatar, cover, ring, toast, modal, closeModal, nav, actions, needAuth } from './core.js';
import * as views from './views.js';

const routes = [
  [/^\/$/, views.feed, 'feed'],
  [/^\/kitoblar$/, views.books, 'books'],
  [/^\/kitob\/(\d+)$/, views.book, 'books'],
  [/^\/reyting$/, views.ranking, 'rank'],
  [/^\/javon$/, views.shelf, 'shelf'],
  [/^\/saqlangan$/, views.saved, 'saved'],
  [/^\/u\/([a-z0-9_]+)$/, views.profile, 'profile'],
  [/^\/yozish(?:\/(\d+))?$/, views.write, 'write', 'focus'],
  [/^\/p\/(\d+)$/, views.post, 'feed', 'focus'],
  [/^\/kirish$/, views.login, 'login', 'bare'],
];

let token = 0;
async function render() {
  const my = ++token;
  const view = $('#view');
  const route = routes.find(([re]) => re.test(location.pathname));
  $('#progress').className = 'run';
  document.documentElement.style.removeProperty('--read');
  if (!route) {
    view.innerHTML = `<div class="page">${notFound()}</div>`;
  } else {
    const [re, fn, key, layout = ''] = route;
    $('#app').dataset.layout = layout;
    document.body.dataset.layout = layout;
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === key && (key !== 'profile' || location.pathname === '/u/' + state.me?.username)));
    try {
      const params = location.pathname.match(re).slice(1);
      const html = await fn(params, new URLSearchParams(location.search));
      if (my !== token) return;
      if (html && typeof html === 'object') { view.innerHTML = html.html; html.mount?.(view); }
      else if (typeof html === 'string') view.innerHTML = html;
    } catch (e) {
      if (my !== token) return;
      view.innerHTML = `<div class="page">${notFound(e.message)}</div>`;
    }
  }
  $('#progress').className = 'done';
  if (location.hash) $(location.hash)?.scrollIntoView();
}
const notFound = (msg = 'Bu sahifa topilmadi') =>
  `<div class="empty">${icon('book')}<h3>${esc(msg)}</h3><p>Balki manzil oʻzgargan yoki oʻchirilgan.</p><a class="btn" href="/">Lentaga qaytish</a></div>`;

nav.go = (url, { replace = false } = {}) => {
  if (url !== location.pathname + location.search) history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.scrollTo(0, 0);
  return render();
};
nav.refresh = render;
window.addEventListener('popstate', render);

document.addEventListener('click', (e) => {
  let act = e.target.closest('[data-act]');
  if (act?.classList.contains('overlay') && e.target !== act) act = null;
  if (act && actions[act.dataset.act]) {
    if (act.tagName === 'A' || act.tagName === 'BUTTON') e.preventDefault();
    return actions[act.dataset.act](act, e);
  }
  const a = e.target.closest('a[href^="/"]');
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && !a.target) {
    e.preventDefault();
    nav.go(a.getAttribute('href'));
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('.overlay')) closeModal(); });

// ---------- qobiq ----------
function shell() {
  const me = state.me;
  const link = (href, key, ic, label) => `<a href="${href}" data-nav="${key}">${icon(ic)}<span>${label}</span></a>`;
  $('#side').innerHTML = `
    <a class="logo" href="/"><span class="logo-mark">${icon('book')}</span><span>Mutolaa</span></a>
    <nav class="side-nav">
      ${link('/', 'feed', 'home', 'Lenta')}
      ${link('/kitoblar', 'books', 'search', 'Kitoblar')}
      ${link('/reyting', 'rank', 'trophy', 'Reyting')}
      ${link('/javon', 'shelf', 'shelf', 'Javonim')}
      ${link('/saqlangan', 'saved', 'mark', 'Saqlanganlar')}
      ${me ? link('/u/' + me.username, 'profile', 'user', 'Profil') : ''}
    </nav>
    <a class="btn primary block side-write" href="/yozish">${icon('pen')}<span>Xulosa yozish</span></a>
    <div class="side-foot">
      <button class="icon-btn" data-act="theme" aria-label="Mavzuni almashtirish">${icon('moon', 'i-moon')}${icon('sun', 'i-sun')}</button>
      ${me ? `<a class="me-chip" href="/u/${me.username}">${avatar(me, 32)}<span><b>${esc(me.name)}</b><small>@${esc(me.username)}</small></span></a>`
           : `<a class="btn small" href="/kirish">Kirish</a>`}
    </div>`;
  const tab = (href, key, ic, label) => `<a href="${href}" data-nav="${key}">${icon(ic)}<span>${label}</span></a>`;
  $('#tabbar').innerHTML = `
    ${tab('/', 'feed', 'home', 'Lenta')}${tab('/kitoblar', 'books', 'search', 'Kitoblar')}
    <a href="/yozish" class="tab-write" aria-label="Xulosa yozish">${icon('pen')}</a>
    ${tab('/reyting', 'rank', 'trophy', 'Reyting')}${tab('/javon', 'shelf', 'shelf', 'Javonim')}`;
}

async function rail() {
  let d;
  try { d = await api('/dashboard'); } catch { return; }
  state.dash = d;
  const m = d.me;
  const max = m ? Math.max(1, ...m.week.map((w) => w.pages)) : 1;
  const days = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
  $('#rail').innerHTML = `
    ${m ? `<section class="card today">
      <div class="card-h"><h3>Bugun</h3><span class="streak ${m.streak ? 'on' : ''}" title="Ketma-ket oʻqilgan kunlar">${icon('flame')}${m.streak} kun</span></div>
      ${ring(m.today, m.daily_goal, 132)}
      <p class="today-msg">${m.today >= m.daily_goal ? 'Kunlik maqsad bajarildi. Barakalla!' : m.today ? `Maqsadgacha yana <b>${num(m.daily_goal - m.today)}</b> sahifa` : m.streak ? 'Seriyani saqlab qolish uchun bugun ham oʻqing' : 'Bugun birinchi sahifani oching'}</p>
      <div class="week">${m.week.map((w) => `<div title="${w.pages} sahifa"><i style="height:${Math.max(6, (w.pages / max) * 100)}%" class="${w.pages ? 'on' : ''}"></i><span>${days[new Date(w.day + 'T00:00:00').getDay()]}</span></div>`).join('')}</div>
      <button class="btn primary block" data-act="log">${icon('plus')}Oʻqiganimni belgilash</button>
    </section>` : `<section class="card join">
      <h3>Oʻqiganingiz izsiz ketmasin</h3>
      <p>Sahifalarni belgilang, seriya yigʻing, xulosalaringizni ulashing.</p>
      <a class="btn primary block" href="/kirish?tab=register">Roʻyxatdan oʻtish</a>
      <button class="btn block ghost" data-act="demo">Demo bilan koʻrish</button>
    </section>`}
    <section class="card">
      <div class="card-h"><h3>Hafta kitobxonlari</h3><a href="/reyting">Hammasi</a></div>
      <ol class="leaders">${d.leaders.map((u) => `<li><span class="rank r${u.rank}">${u.rank}</span><a href="/u/${u.username}">${avatar(u, 30)}<span>${esc(u.name)}</span></a><b>${num(u.value)}</b></li>`).join('')}</ol>
    </section>
    <p class="rail-foot">Mutolaa — oʻqing, kuzating, ulashing.</p>`;
  const pill = $('#mob-streak');
  if (pill) pill.remove();
  if (m) $('#side .logo').insertAdjacentHTML('afterend', `<button id="mob-streak" class="streak ${m.streak ? 'on' : ''}" data-act="log">${icon('flame')}${m.streak}</button>`);
}
nav.rail = rail;

// ---------- global amallar ----------
actions['close-modal'] = closeModal;
actions.theme = () => {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const cur = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
};
actions.logout = async () => {
  await api('/auth/logout', { method: 'POST' });
  state.me = null;
  shell(); rail(); nav.go('/');
  toast('Tizimdan chiqdingiz');
};
actions.demo = async () => {
  try {
    state.me = (await api('/auth/login', { method: 'POST', body: { username: 'demo', password: 'demo1234' } })).me;
    shell(); rail(); nav.go('/');
    toast('Demo sahifaga xush kelibsiz');
  } catch (e) { toast(e.message, 'err'); }
};

async function toggle(el, path, withCount) {
  if (!needAuth()) return;
  const on = !el.classList.contains('on');
  const span = $('span', el);
  el.classList.toggle('on', on);
  el.setAttribute('aria-pressed', on);
  if (withCount) span.textContent = Number(span.textContent) + (on ? 1 : -1);
  try {
    const r = await api(path, { method: 'POST' });
    el.classList.toggle('on', r.on);
    if (withCount) span.textContent = r.count;
    return r;
  } catch (e) {
    el.classList.toggle('on', !on);
    if (withCount) span.textContent = Number(span.textContent) + (on ? -1 : 1);
    toast(e.message, 'err');
  }
}
actions.like = (el) => toggle(el, `/posts/${el.dataset.id}/like`, true);
actions.save = async (el) => { const r = await toggle(el, `/posts/${el.dataset.id}/bookmark`); if (r) toast(r.on ? 'Saqlanganlarga qoʻshildi' : 'Saqlanganlardan olib tashlandi'); };
actions.follow = async (el) => {
  if (!needAuth()) return;
  try {
    const r = await api(`/users/${el.dataset.user}/follow`, { method: 'POST' });
    $$(`[data-act="follow"][data-user="${el.dataset.user}"]`).forEach((b) => {
      b.classList.toggle('primary', !r.on);
      b.textContent = r.on ? 'Obunadasiz' : 'Obuna boʻlish';
    });
    const c = $('#followers-count');
    if (c) c.textContent = r.followers;
  } catch (e) { toast(e.message, 'err'); }
};

// Oʻqilgan sahifalarni belgilash oynasi
actions.log = async (el) => {
  if (!needAuth()) return;
  const d = await api('/dashboard');
  const list = d.me.reading;
  if (!list.length) {
    modal(`<div class="empty">${icon('book')}<h3>Hozir oʻqiyotgan kitobingiz yoʻq</h3><p>Kitob tanlab, «Oʻqiyapman» deb belgilang — shundan soʻng sahifalarni shu yerda kiritasiz.</p><a class="btn primary" href="/kitoblar" data-act="go-close">Kitob tanlash</a></div>`);
    return;
  }
  const pre = Number(el?.dataset.book) || list[0].id;
  const m = modal(`<h2>Qayergacha oʻqidingiz?</h2>
    <div class="log-books">${list.map((b) => `<label class="log-book"><input type="radio" name="lb" value="${b.id}" ${b.id === pre ? 'checked' : ''}>${cover(b, 'xs')}<span><b>${esc(b.title)}</b><small>${b.current_page} / ${b.pages} sahifa</small></span></label>`).join('')}</div>
    <form id="log-form">
      <div class="log-row"><label for="log-page">Hozirgi sahifa</label><output id="log-delta"></output></div>
      <div class="log-input"><input id="log-page" type="number" inputmode="numeric" min="0" required><span id="log-max"></span></div>
      <input id="log-range" type="range" min="0" aria-label="Sahifa">
      <button class="btn primary block">Saqlash</button>
    </form>`);
  const page = $('#log-page', m), range = $('#log-range', m);
  const pickBook = () => {
    const b = list.find((x) => x.id === Number($('input[name=lb]:checked', m).value));
    page.max = range.max = b.pages;
    page.value = range.value = b.current_page;
    $('#log-max', m).textContent = `/ ${b.pages}`;
    sync();
    return b;
  };
  const cur = () => list.find((x) => x.id === Number($('input[name=lb]:checked', m).value));
  const sync = () => {
    const delta = Number(page.value) - cur().current_page;
    $('#log-delta', m).textContent = delta > 0 ? `+${delta} sahifa` : delta < 0 ? `${delta} sahifa` : '';
  };
  pickBook();
  m.addEventListener('change', (e) => { if (e.target.name === 'lb') pickBook(); });
  range.oninput = () => { page.value = range.value; sync(); };
  page.oninput = () => { range.value = page.value; sync(); };
  page.select();
  $('#log-form', m).onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api(`/books/${cur().id}/progress`, { method: 'POST', body: { page: Number(page.value) } });
      closeModal();
      toast(r.finished ? `«${r.title}» tugadi. Tabriklaymiz!` : r.added ? `+${r.added} sahifa · seriya ${r.streak} kun${r.today >= r.goal ? ' · kunlik maqsad bajarildi' : ''}` : 'Saqlandi', 'ok');
      rail();
      if (/^\/(javon|kitob|u)\b/.test(location.pathname)) nav.refresh();
    } catch (err) { toast(err.message, 'err'); }
  };
};
actions['go-close'] = (el) => { closeModal(); nav.go(el.getAttribute('href')); };

// Oʻqish jarayoni chizigʻi (xulosa sahifasida)
window.addEventListener('scroll', () => {
  const art = $('.article-body');
  if (!art) return;
  const r = art.getBoundingClientRect();
  const pct = Math.min(1, Math.max(0, (innerHeight * 0.4 - r.top) / r.height));
  document.documentElement.style.setProperty('--read', pct);
}, { passive: true });

export async function boot() {
  try { state.me = (await api('/me')).me; } catch {}
  shell();
  render();
  rail();
}
nav.shell = shell;
boot();
