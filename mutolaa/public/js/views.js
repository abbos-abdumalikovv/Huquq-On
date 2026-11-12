import { state, $, $$, api, esc, num, ago, dateStr, level, icon, avatar, cover, stars, ring, postCard, postActions, empty, toast, modal, closeModal, nav, actions, needAuth } from './core.js';

const tabs = (items, active) =>
  `<div class="tabs" role="tablist">${items.map(([href, label, key]) => `<a href="${href}" class="${key === active ? 'active' : ''}" role="tab" aria-selected="${key === active}">${label}</a>`).join('')}</div>`;
const postList = (posts, fallback) => (posts.length ? `<div class="posts">${posts.map(postCard).join('')}</div>` : fallback);
const bookTile = (b, extra = '') => `<a class="book-tile" href="/kitob/${b.id}">${cover(b)}<b>${esc(b.title)}</b><small>${esc(b.author)}</small>${extra}</a>`;
const addDays = (day, n) => { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---------- Lenta ----------
export async function feed(_p, q) {
  const t = ['following', 'top'].includes(q.get('t')) ? q.get('t') : 'new';
  const { posts } = await api('/posts' + (t === 'new' ? '' : `?feed=${t}`));
  const hero = state.me ? '' : `<section class="hero">
      <span class="eyebrow">Kitobxonlar jamoasi</span>
      <h1>Oʻqiganingiz — sizniki.<br><em>Xulosangiz — hammaniki.</em></h1>
      <p>Har kuni oʻqigan sahifalaringizni belgilang, seriya yigʻing, reytingda oʻrningizni koʻring va kitobdan olgan xulosalaringizni boshqalar bilan ulashing.</p>
      <div class="hero-cta"><a class="btn primary big" href="/kirish?tab=register">Bepul boshlash</a><button class="btn big ghost" data-act="demo">Demo bilan koʻrish</button></div>
    </section>`;
  const none = t === 'following'
    ? empty('user', 'Obunalar lentasi boʻsh', 'Yoqqan mualliflarga obuna boʻling — ularning yangi xulosalari shu yerda chiqadi.', `<a class="btn" href="/reyting">Kitobxonlarni koʻrish</a>`)
    : empty('pen', 'Hali xulosalar yoʻq', 'Birinchi boʻlib yozing.', `<a class="btn primary" href="/yozish">Xulosa yozish</a>`);
  return `<div class="page">${hero}
    <header class="page-h"><h1>Xulosalar</h1><p>Kitobxonlar oʻqiganlaridan nimani olib qolishdi</p></header>
    ${tabs([['/', 'Yangi', 'new'], ['/?t=following', 'Obunalar', 'following'], ['/?t=top', 'Ommabop', 'top']], t)}
    ${postList(posts, none)}</div>`;
}

export async function saved() {
  if (!state.me) return `<div class="page">${empty('mark', 'Saqlanganlar', 'Keyinroq oʻqish uchun xulosalarni saqlab qoʻying. Buning uchun tizimga kiring.', `<a class="btn primary" href="/kirish?next=/saqlangan">Kirish</a>`)}</div>`;
  const { posts } = await api('/posts?feed=saved');
  return `<div class="page"><header class="page-h"><h1>Saqlanganlar</h1><p>Keyinroq oʻqish uchun olib qoʻyganlaringiz</p></header>
    ${postList(posts, empty('mark', 'Hozircha boʻsh', 'Lentadagi xulosada xatchoʻp belgisini bosing — u shu yerda paydo boʻladi.', `<a class="btn" href="/">Lentaga oʻtish</a>`))}</div>`;
}

// ---------- Kitoblar ----------
export async function books() {
  const d = await api('/books');
  const grid = (list) => list.length
    ? list.map((b) => bookTile(b, `<span class="tile-meta">${b.rating ? `${icon('star', 'gold')}${b.rating}` : ''}<span>${b.readers} oʻquvchi</span></span>${b.my_status ? `<span class="tile-flag ${b.my_status}">${{ want: 'Rejada', reading: 'Oʻqiyapman', done: 'Oʻqilgan' }[b.my_status]}</span>` : ''}`)).join('')
    : `<div class="grid-empty">${empty('search', 'Hech narsa topilmadi', 'Kitob katalogda yoʻqmi? Uni oʻzingiz qoʻshishingiz mumkin.', `<button class="btn primary" data-act="add-book">Kitob qoʻshish</button>`)}</div>`;
  return {
    html: `<div class="page wide">
      <header class="page-h row"><div><h1>Kitoblar</h1><p>Keyingi kitobingizni toping</p></div><button class="btn" data-act="add-book">${icon('plus')}Kitob qoʻshish</button></header>
      <div class="filters">
        <label class="search">${icon('search')}<input id="bq" type="search" placeholder="Kitob yoki muallif nomi" autocomplete="off" aria-label="Qidirish"></label>
        <select id="bsort" aria-label="Saralash"><option value="">Ommabop</option><option value="rating">Yuqori baholangan</option><option value="new">Yangi qoʻshilgan</option><option value="title">Alifbo boʻyicha</option></select>
      </div>
      <div class="chips" id="genres"><button class="chip-btn active" data-g="">Hammasi</button>${d.genres.map((g) => `<button class="chip-btn" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div class="book-grid" id="bgrid">${grid(d.books)}</div></div>`,
    mount(el) {
      let genre = '', timer;
      const load = async () => {
        const qs = new URLSearchParams({ q: $('#bq', el).value.trim(), genre, sort: $('#bsort', el).value });
        try { $('#bgrid', el).innerHTML = grid((await api('/books?' + qs)).books); } catch (e) { toast(e.message, 'err'); }
      };
      $('#bq', el).oninput = () => { clearTimeout(timer); timer = setTimeout(load, 220); };
      $('#bsort', el).onchange = load;
      $('#genres', el).onclick = (e) => {
        const b = e.target.closest('[data-g]');
        if (!b) return;
        genre = b.dataset.g;
        $$('.chip-btn', el).forEach((x) => x.classList.toggle('active', x === b));
        load();
      };
    },
  };
}

actions['add-book'] = () => {
  if (!needAuth()) return;
  const m = modal(`<h2>Kitob qoʻshish</h2><p class="muted">Katalogda yoʻq kitobni qoʻshing — boshqalar ham foydalanadi.</p>
    <form class="form" id="ab">
      <label>Kitob nomi<input name="title" required maxlength="120"></label>
      <label>Muallif<input name="author" required maxlength="80"></label>
      <div class="form-row"><label>Sahifalar soni<input name="pages" type="number" min="1" max="5000" required inputmode="numeric"></label>
      <label>Nashr yili<input name="year" type="number" inputmode="numeric"></label></div>
      <label>Janr<input name="genre" maxlength="40" placeholder="Masalan: Roman"></label>
      <label>Qisqacha tavsif<textarea name="description" rows="3" maxlength="1200"></textarea></label>
      <button class="btn primary block">Qoʻshish</button>
    </form>`);
  $('#ab', m).onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/books', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      closeModal();
      toast(r.existed ? 'Bu kitob katalogda bor ekan' : 'Kitob qoʻshildi', 'ok');
      nav.go('/kitob/' + r.id);
    } catch (err) { toast(err.message, 'err'); }
  };
};

const STATUS = [['want', 'Oʻqimoqchiman'], ['reading', 'Oʻqiyapman'], ['done', 'Oʻqib boʻldim']];

export async function book([id]) {
  const d = await api('/books/' + id);
  const b = d.book, s = d.shelf;
  const pct = s ? Math.round((s.current_page / b.pages) * 100) : 0;
  const reviews = d.reviews.filter((r) => r.review || r.rating);
  return {
    html: `<div class="page">
      <section class="book-hero">
        ${cover(b, 'lg')}
        <div class="book-info">
          <span class="eyebrow">${esc(b.genre)}${b.year ? ` · ${b.year < 0 ? `mil. avv. ${-b.year}` : b.year}` : ''}</span>
          <h1>${esc(b.title)}</h1>
          <p class="book-author">${esc(b.author)}</p>
          <div class="book-meta">
            ${b.rating ? `<span>${stars(b.rating)}<b>${b.rating}</b></span>` : '<span class="muted">Hali baholanmagan</span>'}
            <span>${num(b.pages)} sahifa</span><span>${b.readers} oʻquvchi</span>
          </div>
          <div class="seg" role="group" aria-label="Javondagi holati">${STATUS.map(([k, l]) => `<button data-act="shelf" data-book="${b.id}" data-status="${k}" class="${s?.status === k ? 'active' : ''}" aria-pressed="${s?.status === k}">${s?.status === k ? icon('check') : ''}${l}</button>`).join('')}</div>
          ${s?.status === 'reading' ? `<div class="reading-now"><div class="bar"><i style="width:${pct}%"></i></div><div class="row"><span><b>${s.current_page}</b> / ${b.pages} sahifa · ${pct}%</span><button class="btn small primary" data-act="log" data-book="${b.id}">Belgilash</button></div></div>` : ''}
        </div>
      </section>
      ${b.description ? `<p class="book-desc">${esc(b.description)}</p>` : ''}
      ${s && s.status !== 'want' ? `<section class="card my-review">
        <div class="card-h"><h3>Sizning bahoyingiz</h3><span class="rate" data-book="${b.id}">${[1, 2, 3, 4, 5].map((i) => `<button data-act="rate" data-v="${i}" class="${i <= s.rating ? 'on' : ''}" aria-label="${i} yulduz">${icon('star')}</button>`).join('')}</span></div>
        <form id="rv"><textarea name="review" rows="2" maxlength="1000" placeholder="Bir-ikki jumlada taassurotingiz…">${esc(s.review)}</textarea>
        <div class="row"><a class="link" href="/yozish?kitob=${b.id}">${icon('pen')}Toʻliq xulosa yozish</a><button class="btn small">Saqlash</button></div></form>
      </section>` : ''}
      <div class="tabs" id="btabs"><a href="#" data-t="posts" class="active">Xulosalar <i>${d.posts.length}</i></a><a href="#" data-t="reviews">Taqrizlar <i>${reviews.length}</i></a><a href="#" data-t="readers">Oʻquvchilar <i>${d.readers.length}</i></a></div>
      <div data-pane="posts">${postList(d.posts, empty('pen', 'Bu kitob haqida hali xulosa yoʻq', 'Birinchi boʻlib fikringizni yozing.', `<a class="btn primary" href="/yozish?kitob=${b.id}">Xulosa yozish</a>`))}</div>
      <div data-pane="reviews" hidden>${reviews.length ? reviews.map((r) => `<div class="review"><a href="/u/${r.username}">${avatar(r, 36)}</a><div><div class="row"><a href="/u/${r.username}"><b>${esc(r.name)}</b></a>${r.rating ? stars(r.rating) : ''}<time>${ago(r.updated_at)}</time></div>${r.review ? `<p>${esc(r.review)}</p>` : ''}</div></div>`).join('') : empty('star', 'Taqrizlar yoʻq', 'Kitobni oʻqib boʻlgach, baho va qisqa taassurot qoldiring.')}</div>
      <div data-pane="readers" hidden>${d.readers.length ? `<div class="people">${d.readers.map((r) => `<a href="/u/${r.username}" class="person">${avatar(r, 40)}<span><b>${esc(r.name)}</b><small>${{ want: 'Oʻqimoqchi', reading: `Oʻqiyapti · ${r.current_page}-sahifa`, done: 'Oʻqib boʻlgan' }[r.status]}</small></span></a>`).join('')}</div>` : empty('user', 'Hali hech kim oʻqimagan', 'Birinchi oʻquvchi boʻling.')}</div>
    </div>`,
    mount(el) {
      $('#btabs', el).onclick = (e) => {
        const a = e.target.closest('[data-t]');
        if (!a) return;
        e.preventDefault(); e.stopPropagation();
        $$('#btabs a', el).forEach((x) => x.classList.toggle('active', x === a));
        $$('[data-pane]', el).forEach((p) => { p.hidden = p.dataset.pane !== a.dataset.t; });
      };
      const rv = $('#rv', el);
      if (rv) rv.onsubmit = async (e) => {
        e.preventDefault();
        try {
          await api(`/books/${b.id}/review`, { method: 'PUT', body: { rating: $$('.rate .on', el).length, review: rv.review.value } });
          toast('Taqriz saqlandi', 'ok');
          nav.refresh();
        } catch (err) { toast(err.message, 'err'); }
      };
    },
  };
}

actions.shelf = async (el) => {
  if (!needAuth()) return;
  const active = el.classList.contains('active');
  try {
    if (active) await api(`/books/${el.dataset.book}/shelf`, { method: 'DELETE' });
    else await api(`/books/${el.dataset.book}/shelf`, { method: 'PUT', body: { status: el.dataset.status } });
    toast(active ? 'Javondan olib tashlandi' : { want: 'Rejaga qoʻshildi', reading: 'Yoqimli mutolaa!', done: 'Oʻqilganlarga qoʻshildi' }[el.dataset.status], 'ok');
    nav.rail(); nav.refresh();
  } catch (e) { toast(e.message, 'err'); }
};
actions.rate = async (el) => {
  const box = el.closest('.rate'), v = Number(el.dataset.v);
  $$('button', box).forEach((b) => b.classList.toggle('on', Number(b.dataset.v) <= v));
  try {
    await api(`/books/${box.dataset.book}/review`, { method: 'PUT', body: { rating: v, review: $('#rv')?.review.value || '' } });
    toast('Baho saqlandi', 'ok');
  } catch (e) { toast(e.message, 'err'); }
};

// ---------- Reyting ----------
export async function ranking(_p, q) {
  const d = await api(`/leaderboard?period=${q.get('d') || 'week'}&metric=${q.get('m') || 'pages'}`);
  const unit = { pages: 'sahifa', books: 'kitob', streak: 'kun' }[d.metric];
  const url = (p, m) => `/reyting?d=${p}&m=${m}`;
  const seg = (items, cur, mk) => `<div class="seg">${items.map(([k, l]) => `<a href="${mk(k)}" class="${k === cur ? 'active' : ''}">${l}</a>`).join('')}</div>`;
  const top = d.rows.slice(0, 3), rest = d.rows.slice(3);
  const mine = state.me?.username;
  const pod = (u, place) => u ? `<a href="/u/${u.username}" class="pod p${place}">
      <span class="pod-av">${avatar(u, place === 1 ? 76 : 60)}<i>${place}</i></span>
      <b>${esc(u.name)}</b><span class="pod-v">${num(u.value)} <small>${unit}</small></span><span class="pod-base"></span></a>` : '<span class="pod"></span>';
  return `<div class="page">
    <header class="page-h"><h1>Reyting</h1><p>Kim qancha oʻqidi — halol hisob, sogʻlom raqobat</p></header>
    <div class="rank-controls">
      ${seg([['pages', 'Sahifalar'], ['books', 'Kitoblar'], ['streak', 'Seriya']], d.metric, (k) => url(d.period, k))}
      ${d.metric === 'streak' ? '' : seg([['week', 'Hafta'], ['month', 'Oy'], ['all', 'Barcha vaqt']], d.period, (k) => url(k, d.metric))}
    </div>
    ${d.rows.length ? `
      <div class="podium">${pod(top[1], 2)}${pod(top[0], 1)}${pod(top[2], 3)}</div>
      ${state.me ? `<div class="my-rank">${d.me ? `<span>Sizning oʻrningiz</span><b>${d.me.rank}-oʻrin</b><span class="grow"></span><b>${num(d.me.value)} ${unit}</b>` : `<span>Bu davrda hali natijangiz yoʻq</span><span class="grow"></span><button class="btn small primary" data-act="log">Oʻqishni boshlash</button>`}</div>` : ''}
      <ol class="rank-list">${rest.map((u) => `<li class="${u.username === mine ? 'me' : ''}"><span class="rank">${u.rank}</span><a href="/u/${u.username}">${avatar(u, 38)}<span><b>${esc(u.name)}</b><small>@${esc(u.username)}</small></span></a><b class="val">${num(u.value)} <small>${unit}</small></b></li>`).join('')}</ol>`
    : empty('trophy', 'Bu davrda hali natija yoʻq', 'Birinchi sahifani oʻqing va peshqadam boʻling.')}
  </div>`;
}

// ---------- Javon ----------
export async function shelf() {
  if (!state.me) return `<div class="page">${empty('shelf', 'Shaxsiy javoningiz', 'Oʻqiyotgan, oʻqigan va oʻqimoqchi boʻlgan kitoblaringizni bir joyda saqlang.', `<a class="btn primary" href="/kirish?next=/javon">Kirish</a>`)}</div>`;
  const d = await api('/users/' + state.me.username);
  const by = (st) => d.shelf.filter((b) => b.status === st);
  const reading = by('reading'), want = by('want'), done = by('done');
  const goalPct = Math.min(100, Math.round((d.stats.yearBooks / d.user.year_goal) * 100));
  return `<div class="page">
    <header class="page-h row"><div><h1>Javonim</h1><p>${d.shelf.length} ta kitob · ${num(d.stats.pages)} sahifa oʻqilgan</p></div><a class="btn" href="/kitoblar">${icon('plus')}Kitob qoʻshish</a></header>
    <section class="card goal">
      <div><span class="eyebrow">${new Date().getFullYear()}-yil maqsadi</span><h3><b>${d.stats.yearBooks}</b> / ${d.user.year_goal} kitob</h3></div>
      <div class="bar"><i style="width:${goalPct}%"></i></div>
      <button class="link" data-act="edit-profile">Maqsadni oʻzgartirish</button>
    </section>
    <h2 class="sec">Oʻqiyapman <i>${reading.length}</i></h2>
    ${reading.length ? `<div class="reading-list">${reading.map((b) => { const pct = Math.round((b.current_page / b.pages) * 100); return `<div class="reading-card"><a href="/kitob/${b.id}">${cover(b, 'sm')}</a><div><a href="/kitob/${b.id}"><b>${esc(b.title)}</b></a><small>${esc(b.author)}</small><div class="bar"><i style="width:${pct}%"></i></div><div class="row"><span class="muted">${b.current_page} / ${b.pages} · ${pct}%</span><button class="btn small primary" data-act="log" data-book="${b.id}">Belgilash</button></div></div></div>`; }).join('')}</div>`
      : empty('book', 'Hozir hech narsa oʻqimayapsiz', 'Kitob tanlang va «Oʻqiyapman» deb belgilang.', `<a class="btn primary" href="/kitoblar">Kitob tanlash</a>`)}
    ${want.length ? `<h2 class="sec">Oʻqimoqchiman <i>${want.length}</i></h2><div class="book-grid">${want.map((b) => bookTile(b)).join('')}</div>` : ''}
    ${done.length ? `<h2 class="sec">Oʻqib boʻldim <i>${done.length}</i></h2><div class="book-grid">${done.map((b) => bookTile(b, b.my_rating ? stars(b.my_rating, 'sm') : '')).join('')}</div>` : ''}
  </div>`;
}

// ---------- Profil ----------
function heatmap(heat, today) {
  const wd = (new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7;
  const total = 25 * 7 + wd + 1;
  const lvl = (n) => (!n ? 0 : n < 15 ? 1 : n < 30 ? 2 : n < 50 ? 3 : 4);
  let cells = '';
  for (let i = total - 1; i >= 0; i--) {
    const day = addDays(today, -i), n = heat[day] || 0;
    cells += `<i class="l${lvl(n)}" title="${dateStr(day)}: ${n} sahifa"></i>`;
  }
  return `<div class="heat-wrap"><div class="heat">${cells}</div></div>
    <div class="heat-legend"><span>Kam</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>Koʻp</span></div>`;
}

export async function profile([username]) {
  const d = await api('/users/' + username);
  const u = d.user, s = d.stats, lv = level(s.pages);
  const done = d.shelf.filter((b) => b.status === 'done'), reading = d.shelf.filter((b) => b.status === 'reading');
  const stat = (v, l, id = '') => `<div><b ${id ? `id="${id}"` : ''}>${v}</b><span>${l}</span></div>`;
  return {
    html: `<div class="page">
      <section class="profile-head">
        ${avatar(u, 96)}
        <div class="profile-id">
          <h1>${esc(u.name)}</h1>
          <p class="muted">@${esc(u.username)} · ${dateStr(u.created_at)}dan beri</p>
          ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ''}
        </div>
        <div class="profile-btns">${d.isMe
          ? `<button class="btn" data-act="edit-profile">${icon('edit')}Tahrirlash</button><button class="icon-btn" data-act="logout" aria-label="Chiqish" title="Chiqish">${icon('out')}</button>`
          : `<button class="btn ${d.following ? '' : 'primary'}" data-act="follow" data-user="${u.username}">${d.following ? 'Obunadasiz' : 'Obuna boʻlish'}</button>`}</div>
      </section>
      <section class="stats">${stat(num(s.pages), 'sahifa')}${stat(s.books, 'kitob')}${stat(`${icon('flame')}${s.streak}`, 'kunlik seriya')}${stat(s.followers, 'obunachi', 'followers-count')}${stat(s.posts, 'xulosa')}</section>
      <section class="card level">
        <div class="row"><span><span class="eyebrow">${lv.n}-daraja</span><h3>${lv.title}</h3></span><span class="muted">${lv.next ? `Keyingi darajagacha ${num(lv.next - s.pages)} sahifa` : 'Eng yuqori daraja'}</span></div>
        <div class="bar gold"><i style="width:${lv.pct}%"></i></div>
      </section>
      <section class="card">
        <div class="card-h"><h3>Mutolaa xaritasi</h3><span class="muted">Eng uzun seriya: ${s.best} kun</span></div>
        ${heatmap(d.heat, d.today)}
      </section>
      <section class="card">
        <div class="card-h"><h3>Yutuqlar</h3><span class="muted">${d.badges.filter((x) => x.earned).length} / ${d.badges.length}</span></div>
        <div class="badges">${d.badges.map((x) => `<div class="badge ${x.earned ? 'on' : ''}" title="${esc(x.desc)}"><span>${x.icon}</span><b>${esc(x.title)}</b><small>${esc(x.desc)}</small></div>`).join('')}</div>
      </section>
      <div class="tabs" id="ptabs"><a href="#" data-t="posts" class="active">Xulosalar <i>${d.posts.length}</i></a><a href="#" data-t="shelf">Javon <i>${d.shelf.length}</i></a></div>
      <div data-pane="posts">${postList(d.posts, empty('pen', d.isMe ? 'Hali xulosa yozmadingiz' : 'Hali xulosa yozmagan', d.isMe ? 'Oʻqigan kitobingizdan nimani olib qoldingiz? Yozing — yozganda fikr tiniqlashadi.' : 'Yangi xulosalar shu yerda paydo boʻladi.', d.isMe ? `<a class="btn primary" href="/yozish">Xulosa yozish</a>` : ''))}</div>
      <div data-pane="shelf" hidden>
        ${reading.length ? `<h2 class="sec">Hozir oʻqiyapti</h2><div class="book-grid">${reading.map((b) => bookTile(b, `<span class="tile-meta"><span>${Math.round((b.current_page / b.pages) * 100)}%</span></span>`)).join('')}</div>` : ''}
        ${done.length ? `<h2 class="sec">Oʻqib boʻlgan</h2><div class="book-grid">${done.map((b) => bookTile(b, b.my_rating ? stars(b.my_rating, 'sm') : '')).join('')}</div>` : ''}
        ${!reading.length && !done.length ? empty('shelf', 'Javon boʻsh', 'Bu yerda oʻqilgan kitoblar koʻrinadi.') : ''}
      </div>
    </div>`,
    mount(el) {
      $('#ptabs', el).onclick = (e) => {
        const a = e.target.closest('[data-t]');
        if (!a) return;
        e.preventDefault(); e.stopPropagation();
        $$('#ptabs a', el).forEach((x) => x.classList.toggle('active', x === a));
        $$('[data-pane]', el).forEach((p) => { p.hidden = p.dataset.pane !== a.dataset.t; });
      };
    },
  };
}

actions['edit-profile'] = () => {
  const me = state.me;
  const m = modal(`<h2>Profil va maqsadlar</h2>
    <form class="form" id="ep">
      <label>Ism<input name="name" required maxlength="40" value="${esc(me.name)}"></label>
      <label>Oʻzingiz haqingizda<textarea name="bio" rows="2" maxlength="200">${esc(me.bio)}</textarea></label>
      <div class="form-row"><label>Kunlik maqsad (sahifa)<input name="daily_goal" type="number" min="1" max="1000" value="${me.daily_goal}" inputmode="numeric"></label>
      <label>Yillik maqsad (kitob)<input name="year_goal" type="number" min="1" max="365" value="${me.year_goal}" inputmode="numeric"></label></div>
      <button class="btn primary block">Saqlash</button>
    </form>`);
  $('#ep', m).onsubmit = async (e) => {
    e.preventDefault();
    try {
      state.me = (await api('/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) })).me;
      closeModal(); toast('Saqlandi', 'ok');
      nav.shell(); nav.rail(); nav.refresh();
    } catch (err) { toast(err.message, 'err'); }
  };
};

// ---------- Xulosa sahifasi ----------
export async function post([id]) {
  const d = await api('/posts/' + id);
  const p = d.post, mine = state.me?.username === p.username;
  const comment = (c) => `<div class="comment" data-c="${c.id}">${avatar(c, 34)}<div><div class="row"><a href="/u/${c.username}"><b>${esc(c.name)}</b></a><time>${ago(c.created_at)}</time>${c.username === state.me?.username ? `<button class="icon-btn tiny" data-act="del-comment" data-id="${c.id}" aria-label="Izohni oʻchirish">${icon('trash')}</button>` : ''}</div><p>${esc(c.body)}</p></div></div>`;
  return {
    html: `<article class="article">
      ${p.book_id ? `<a class="chip" href="/kitob/${p.book_id}">${icon('book')}${esc(p.book_title)} · ${esc(p.book_author)}</a>` : ''}
      <h1>${esc(p.title)}</h1>
      ${p.subtitle ? `<p class="article-sub">${esc(p.subtitle)}</p>` : ''}
      <div class="article-by">
        <a href="/u/${p.username}">${avatar(p, 44)}</a>
        <div><a href="/u/${p.username}"><b>${esc(p.name)}</b></a><small>${dateStr(p.created_at)} · ${p.read_min} daqiqalik oʻqish</small></div>
        <span class="grow"></span>
        ${mine ? `<a class="btn small" href="/yozish/${p.id}">${icon('edit')}Tahrirlash</a><button class="icon-btn" data-act="del-post" data-id="${p.id}" aria-label="Oʻchirish">${icon('trash')}</button>`
               : `<button class="btn small ${p.following ? '' : 'primary'}" data-act="follow" data-user="${p.username}">${p.following ? 'Obunadasiz' : 'Obuna boʻlish'}</button>`}
      </div>
      <div class="article-body prose">${p.body}</div>
      ${p.book_id ? `<a class="book-card" href="/kitob/${p.book_id}">${cover({ title: p.book_title, author: p.book_author, hue: p.book_hue }, 'sm')}<span><small>Xulosa shu kitob haqida</small><b>${esc(p.book_title)}</b><span>${esc(p.book_author)} · ${p.book_pages} sahifa</span></span>${icon('arrow')}</a>` : ''}
      <div class="article-actions">${postActions(p)}</div>
      <section id="izohlar" class="comments">
        <h2>Izohlar <i id="cc">${d.comments.length}</i></h2>
        ${state.me ? `<form id="cf" class="comment-form">${avatar(state.me, 34)}<textarea name="body" rows="1" maxlength="1000" placeholder="Fikringizni yozing…" required></textarea><button class="btn primary small">Yuborish</button></form>`
                   : `<p class="muted"><a class="link" href="/kirish?next=/p/${p.id}">Tizimga kiring</a> va fikr bildiring.</p>`}
        <div id="clist">${d.comments.map(comment).join('')}</div>
      </section>
      ${d.more.length ? `<section class="more"><h2>${esc(p.name)}ning boshqa xulosalari</h2><div class="posts">${d.more.map(postCard).join('')}</div></section>` : ''}
    </article>`,
    mount(el) {
      const f = $('#cf', el);
      if (!f) return;
      f.body.oninput = () => { f.body.style.height = 'auto'; f.body.style.height = f.body.scrollHeight + 'px'; };
      f.onsubmit = async (e) => {
        e.preventDefault();
        try {
          const r = await api(`/posts/${p.id}/comments`, { method: 'POST', body: { body: f.body.value } });
          $('#clist', el).insertAdjacentHTML('beforeend', comment(r.comment));
          $('#cc', el).textContent = Number($('#cc', el).textContent) + 1;
          f.reset(); f.body.style.height = 'auto';
        } catch (err) { toast(err.message, 'err'); }
      };
    },
  };
}
actions['del-comment'] = async (el) => {
  try {
    await api('/comments/' + el.dataset.id, { method: 'DELETE' });
    el.closest('.comment').remove();
    $('#cc').textContent = Number($('#cc').textContent) - 1;
  } catch (e) { toast(e.message, 'err'); }
};
actions['del-post'] = (el) => {
  modal(`<h2>Xulosani oʻchirasizmi?</h2><p class="muted">Bu amalni ortga qaytarib boʻlmaydi. Izohlar va yoqtirishlar ham oʻchadi.</p>
    <div class="row end"><button class="btn" data-act="close-modal">Bekor qilish</button><button class="btn danger" data-act="del-post-yes" data-id="${el.dataset.id}">Oʻchirish</button></div>`);
};
actions['del-post-yes'] = async (el) => {
  try {
    await api('/posts/' + el.dataset.id, { method: 'DELETE' });
    closeModal(); toast('Xulosa oʻchirildi');
    nav.go('/u/' + state.me.username);
  } catch (e) { toast(e.message, 'err'); }
};

// ---------- Muharrir ----------
const DRAFT = 'mutolaa-draft';
export async function write([id], q) {
  if (!state.me) return `<div class="page">${empty('pen', 'Xulosa yozish', 'Kitobdan olganlaringizni yozing va boshqalar bilan ulashing. Buning uchun tizimga kiring.', `<a class="btn primary" href="/kirish?next=/yozish">Kirish</a>`)}</div>`;
  const [{ books: list }, existing] = await Promise.all([api('/books?sort=title'), id ? api('/posts/' + id) : null]);
  if (existing && existing.post.username !== state.me.username) throw new Error('Bu xulosani tahrirlay olmaysiz');
  let draft = {};
  if (existing) draft = { title: existing.post.title, subtitle: existing.post.subtitle, body: existing.post.body, book_id: existing.post.book_id };
  else { try { draft = JSON.parse(localStorage.getItem(DRAFT)) || {}; } catch {} }
  const bookId = Number(q.get('kitob')) || draft.book_id || '';
  const tool = (cmd, ic, label, arg = '') => `<button type="button" data-cmd="${cmd}" data-arg="${arg}" aria-label="${label}" title="${label}">${ic}</button>`;
  return {
    html: `<form class="editor" id="ed">
      <div class="editor-bar">
        <span class="muted" id="ed-status">${existing ? 'Tahrirlash' : draft.title || draft.body ? 'Qoralama tiklandi' : 'Yangi xulosa'}</span>
        <span class="grow"></span>
        <a class="btn small ghost" href="${existing ? '/p/' + id : '/'}">Bekor qilish</a>
        <button class="btn small primary">${existing ? 'Saqlash' : 'Chop etish'}</button>
      </div>
      <select name="book_id" class="book-select" aria-label="Kitob"><option value="">Kitobni tanlang (ixtiyoriy)</option>${list.map((b) => `<option value="${b.id}" ${b.id === bookId ? 'selected' : ''}>${esc(b.title)} — ${esc(b.author)}</option>`).join('')}</select>
      <textarea name="title" class="ed-title" rows="1" maxlength="140" placeholder="Sarlavha" required>${esc(draft.title || '')}</textarea>
      <textarea name="subtitle" class="ed-sub" rows="1" maxlength="200" placeholder="Qisqa izoh (ixtiyoriy)">${esc(draft.subtitle || '')}</textarea>
      <div class="toolbar" role="toolbar" aria-label="Formatlash">
        ${tool('bold', '<b>B</b>', 'Qalin')}${tool('italic', '<i>I</i>', 'Kursiv')}<span class="sep"></span>
        ${tool('formatBlock', 'H', 'Sarlavha', 'h2')}${tool('formatBlock', icon('quote'), 'Iqtibos', 'blockquote')}${tool('insertUnorderedList', icon('list'), 'Roʻyxat')}
      </div>
      <div class="ed-body prose" id="ed-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Xulosa matni" data-ph="Kitob sizga nima berdi? Qaysi fikr yodingizda qoldi?…">${draft.body || ''}</div>
    </form>`,
    mount(el) {
      const form = $('#ed', el), body = $('#ed-body', el);
      const grow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
      [form.title, form.subtitle].forEach((t) => { grow(t); t.addEventListener('input', () => grow(t)); t.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); (t === form.title ? form.subtitle : body).focus(); } }); });
      try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch {}
      $('.toolbar', el).addEventListener('mousedown', (e) => {
        const b = e.target.closest('[data-cmd]');
        if (!b) return;
        e.preventDefault();
        body.focus();
        let arg = b.dataset.arg;
        if (b.dataset.cmd === 'formatBlock') {
          const node = getSelection().anchorNode;
          const block = (node?.nodeType === 1 ? node : node?.parentElement)?.closest('h2,blockquote');
          if (block?.tagName.toLowerCase() === arg) arg = 'p';
        }
        document.execCommand(b.dataset.cmd, false, arg || null);
        save();
      });
      body.addEventListener('focus', () => { if (!body.textContent && !body.children.length) document.execCommand('formatBlock', false, 'p'); });
      body.addEventListener('paste', (e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      });
      const data = () => ({ title: form.title.value, subtitle: form.subtitle.value, body: body.innerHTML, book_id: Number(form.book_id.value) || null });
      let timer;
      const save = () => {
        if (existing) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          try { localStorage.setItem(DRAFT, JSON.stringify(data())); $('#ed-status', el).textContent = 'Qoralama saqlandi'; } catch {}
        }, 500);
      };
      form.addEventListener('input', save);
      form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = $('button.primary', form);
        btn.disabled = true;
        try {
          const r = await api(existing ? '/posts/' + id : '/posts', { method: existing ? 'PUT' : 'POST', body: data() });
          clearTimeout(timer);
          if (!existing) { try { localStorage.removeItem(DRAFT); } catch {} }
          toast(existing ? 'Oʻzgarishlar saqlandi' : 'Xulosa chop etildi', 'ok');
          nav.go('/p/' + r.id);
        } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
      };
      (form.title.value ? body : form.title).focus();
    },
  };
}

// ---------- Kirish ----------
export async function login(_p, q) {
  if (state.me) { nav.go('/', { replace: true }); return ''; }
  const reg = q.get('tab') === 'register';
  const next = q.get('next')?.startsWith('/') && !q.get('next').startsWith('//') ? q.get('next') : '/';
  return {
    html: `<div class="auth">
      <section class="auth-art">
        <a class="logo" href="/"><span class="logo-mark">${icon('book')}</span><span>Mutolaa</span></a>
        <blockquote>Kitob — beminnat ustoz.<cite>Xalq hikmati</cite></blockquote>
        <ul><li>${icon('flame')}Kunlik seriya va maqsadlar</li><li>${icon('trophy')}Kitobxonlar reytingi</li><li>${icon('pen')}Xulosalar yozish va ulashish</li></ul>
      </section>
      <section class="auth-form">
        <h1>${reg ? 'Mutolaaga qoʻshiling' : 'Xush kelibsiz'}</h1>
        <p class="muted">${reg ? 'Bir daqiqada roʻyxatdan oʻting.' : 'Hisobingizga kiring.'}</p>
        <form class="form" id="af">
          ${reg ? `<label>Ismingiz<input name="name" required maxlength="40" autocomplete="name"></label>` : ''}
          <label>Foydalanuvchi nomi<input name="username" required maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
          <label>Parol<input name="password" type="password" required minlength="6" autocomplete="${reg ? 'new-password' : 'current-password'}"></label>
          <p class="form-err" id="af-err" role="alert" hidden></p>
          <button class="btn primary block big">${reg ? 'Roʻyxatdan oʻtish' : 'Kirish'}</button>
        </form>
        <button class="btn block ghost" data-act="demo">Demo hisob bilan koʻrish</button>
        <p class="auth-switch">${reg ? `Hisobingiz bormi? <a class="link" href="/kirish?next=${encodeURIComponent(next)}">Kirish</a>` : `Hisobingiz yoʻqmi? <a class="link" href="/kirish?tab=register&next=${encodeURIComponent(next)}">Roʻyxatdan oʻtish</a>`}</p>
      </section>
    </div>`,
    mount(el) {
      $('#af', el).onsubmit = async (e) => {
        e.preventDefault();
        const err = $('#af-err', el);
        err.hidden = true;
        try {
          state.me = (await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) })).me;
          nav.shell(); nav.rail();
          toast(reg ? 'Xush kelibsiz! Birinchi kitobingizni tanlang' : `Salom, ${state.me.name}`, 'ok');
          nav.go(reg && next === '/' ? '/kitoblar' : next);
        } catch (ex) { err.textContent = ex.message; err.hidden = false; }
      };
      $('input', el).focus();
    },
  };
}
