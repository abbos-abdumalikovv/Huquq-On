import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, get, run, today, addDays, hueOf, hashPass } from './db.js';
import { seedIfEmpty } from './seed.js';

seedIfEmpty();

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '400kb' }));

// ---------- yordamchilar ----------
const now = () => new Date().toISOString();
const fail = (res, code, error) => res.status(code).json({ error });
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const int = (v, min, max, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

const ALLOWED = new Set(['p', 'h2', 'h3', 'blockquote', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'br']);
// Faqat ruxsat etilgan teglar, atributlarsiz qoladi; qolgan hammasi matnga aylanadi.
export function sanitize(html) {
  return String(html || '')
    .replace(/[\u0001\u0002]/g, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(\/?)([a-zA-Z0-9]+)[^>]*>/g, (_, slash, tag) => {
      tag = tag.toLowerCase();
      if (tag === 'div') tag = 'p';
      return ALLOWED.has(tag) ? `\u0001${slash}${tag}\u0002` : '';
    })
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\u0001/g, '<').replace(/\u0002/g, '>')
    .replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, '')
    .trim();
}
const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// ---------- sessiya ----------
app.use((req, _res, next) => {
  const m = /(?:^|;\s*)sid=([a-f0-9]{48})/.exec(req.headers.cookie || '');
  req.user = m ? get(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?`, m[1]) : null;
  req.sid = m?.[1];
  next();
});
const auth = (req, res, next) => (req.user ? next() : fail(res, 401, 'Avval tizimga kiring'));
const uid = (req) => req.user?.id ?? 0;

function startSession(res, userId) {
  const token = crypto.randomBytes(24).toString('hex');
  run(`INSERT INTO sessions VALUES(?,?,?)`, token, userId, now());
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 60}${secure}`);
}

const attempts = new Map();
function limited(req) {
  const key = req.ip, t = Date.now();
  const list = (attempts.get(key) || []).filter((x) => t - x < 60_000);
  list.push(t);
  attempts.set(key, list);
  return list.length > 20;
}

// ---------- statistika ----------
function streaks(userId) {
  const days = all(`SELECT DISTINCT day FROM reading_logs WHERE user_id=? AND pages>0 ORDER BY day DESC`, userId).map((r) => r.day);
  const set = new Set(days);
  const t = today();
  let cur = 0, d = set.has(t) ? t : addDays(t, -1);
  while (set.has(d)) { cur++; d = addDays(d, -1); }
  let best = 0, runLen = 0, prev = null;
  for (const day of days) {
    runLen = prev && addDays(prev, -1) === day ? runLen + 1 : 1;
    if (runLen > best) best = runLen;
    prev = day;
  }
  return { streak: cur, best };
}

function userStats(userId) {
  const one = (sql, ...p) => get(sql, ...p).n;
  const t = today();
  return {
    pages: one(`SELECT COALESCE(SUM(pages),0) n FROM reading_logs WHERE user_id=?`, userId),
    today: one(`SELECT COALESCE(SUM(pages),0) n FROM reading_logs WHERE user_id=? AND day=?`, userId, t),
    books: one(`SELECT COUNT(*) n FROM shelves WHERE user_id=? AND status='done'`, userId),
    yearBooks: one(`SELECT COUNT(*) n FROM shelves WHERE user_id=? AND status='done' AND finished_at>=?`, userId, t.slice(0, 4)),
    posts: one(`SELECT COUNT(*) n FROM posts WHERE user_id=?`, userId),
    likes: one(`SELECT COUNT(*) n FROM likes l JOIN posts p ON p.id=l.post_id WHERE p.user_id=?`, userId),
    followers: one(`SELECT COUNT(*) n FROM follows WHERE following_id=?`, userId),
    following: one(`SELECT COUNT(*) n FROM follows WHERE follower_id=?`, userId),
    ...streaks(userId),
  };
}

const pub = (u) => ({ username: u.username, name: u.name, bio: u.bio, color: u.color, created_at: u.created_at });
const meOut = (u) => ({ ...pub(u), daily_goal: u.daily_goal, year_goal: u.year_goal });

function leaderboard(period, metric, limit = 50) {
  const t = today();
  const since = period === 'week' ? addDays(t, -6) : period === 'month' ? addDays(t, -29) : '0000';
  let rows;
  if (metric === 'books') {
    rows = all(`SELECT u.id,u.username,u.name,u.color,COUNT(*) value FROM shelves s JOIN users u ON u.id=s.user_id
      WHERE s.status='done' AND COALESCE(s.finished_at,'0001')>=? GROUP BY u.id ORDER BY value DESC, u.id`, since);
  } else if (metric === 'streak') {
    rows = all(`SELECT id,username,name,color FROM users`).map((u) => ({ ...u, value: streaks(u.id).streak }))
      .filter((u) => u.value > 0).sort((a, b) => b.value - a.value || a.id - b.id);
  } else {
    rows = all(`SELECT u.id,u.username,u.name,u.color,SUM(l.pages) value FROM reading_logs l JOIN users u ON u.id=l.user_id
      WHERE l.day>=? GROUP BY u.id HAVING value>0 ORDER BY value DESC, u.id`, since);
  }
  rows.forEach((r, i) => { r.rank = i + 1; });
  return { rows: rows.slice(0, limit), all: rows };
}

const POST_COLS = `p.id,p.title,p.subtitle,p.excerpt,p.read_min,p.created_at,
  u.username,u.name,u.color,b.id book_id,b.title book_title,b.author book_author,b.hue book_hue,
  (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) likes,
  (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comments,
  EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=?) liked,
  EXISTS(SELECT 1 FROM bookmarks m WHERE m.post_id=p.id AND m.user_id=?) saved`;
const POST_FROM = `FROM posts p JOIN users u ON u.id=p.user_id LEFT JOIN books b ON b.id=p.book_id`;
const listPosts = (me, where = '1', params = [], order = 'p.created_at DESC') =>
  all(`SELECT ${POST_COLS} ${POST_FROM} WHERE ${where} ORDER BY ${order} LIMIT 60`, me, me, ...params);

const BOOK_COLS = `b.id,b.title,b.author,b.pages,b.genre,b.year,b.hue,
  (SELECT COUNT(*) FROM shelves s WHERE s.book_id=b.id) readers,
  (SELECT ROUND(AVG(rating),1) FROM shelves s WHERE s.book_id=b.id AND rating>0) rating`;
const shelfBooks = (userId) =>
  all(`SELECT ${BOOK_COLS}, s.status, s.current_page, s.rating my_rating, s.finished_at
    FROM shelves s JOIN books b ON b.id=s.book_id WHERE s.user_id=? ORDER BY s.updated_at DESC`, userId);

// ---------- auth ----------
app.post('/api/auth/register', (req, res) => {
  if (limited(req)) return fail(res, 429, 'Juda koʻp urinish. Bir daqiqadan soʻng qayta urining');
  const username = str(req.body.username, 20).toLowerCase();
  const name = str(req.body.name, 40);
  const password = String(req.body.password || '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return fail(res, 400, 'Foydalanuvchi nomi 3–20 ta lotin harfi, raqam yoki _ dan iborat boʻlsin');
  if (name.length < 2) return fail(res, 400, 'Ismingizni kiriting');
  if (password.length < 6) return fail(res, 400, 'Parol kamida 6 ta belgidan iborat boʻlsin');
  if (get(`SELECT 1 FROM users WHERE username=?`, username)) return fail(res, 409, 'Bu foydalanuvchi nomi band');
  const salt = crypto.randomBytes(12).toString('hex');
  const r = run(`INSERT INTO users(username,name,pass_hash,salt,color,created_at) VALUES(?,?,?,?,?,?)`,
    username, name, hashPass(password, salt), salt, hueOf(username), now());
  startSession(res, Number(r.lastInsertRowid));
  res.json({ me: meOut(get(`SELECT * FROM users WHERE id=?`, r.lastInsertRowid)) });
});

app.post('/api/auth/login', (req, res) => {
  if (limited(req)) return fail(res, 429, 'Juda koʻp urinish. Bir daqiqadan soʻng qayta urining');
  const u = get(`SELECT * FROM users WHERE username=?`, str(req.body.username, 20).toLowerCase());
  const ok = u && crypto.timingSafeEqual(Buffer.from(hashPass(String(req.body.password || ''), u.salt)), Buffer.from(u.pass_hash));
  if (!ok) return fail(res, 401, 'Foydalanuvchi nomi yoki parol notoʻgʻri');
  startSession(res, u.id);
  res.json({ me: meOut(u) });
});

app.post('/api/auth/logout', (req, res) => {
  if (req.sid) run(`DELETE FROM sessions WHERE token=?`, req.sid);
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => res.json({ me: req.user ? meOut(req.user) : null }));

app.put('/api/me', auth, (req, res) => {
  const name = str(req.body.name, 40);
  if (name.length < 2) return fail(res, 400, 'Ismingizni kiriting');
  run(`UPDATE users SET name=?, bio=?, daily_goal=?, year_goal=? WHERE id=?`, name, str(req.body.bio, 200),
    int(req.body.daily_goal, 1, 1000, 20), int(req.body.year_goal, 1, 365, 12), req.user.id);
  res.json({ me: meOut(get(`SELECT * FROM users WHERE id=?`, req.user.id)) });
});

// ---------- bosh panel ----------
app.get('/api/dashboard', (req, res) => {
  const out = { leaders: leaderboard('week', 'pages', 5).rows.map(({ id, ...r }) => r), me: null };
  if (req.user) {
    const s = userStats(req.user.id);
    const t = today();
    const logs = Object.fromEntries(all(`SELECT day, SUM(pages) n FROM reading_logs WHERE user_id=? AND day>=? GROUP BY day`,
      req.user.id, addDays(t, -6)).map((r) => [r.day, r.n]));
    out.me = {
      ...s, daily_goal: req.user.daily_goal, year_goal: req.user.year_goal,
      week: Array.from({ length: 7 }, (_, i) => { const d = addDays(t, i - 6); return { day: d, pages: logs[d] || 0 }; }),
      reading: shelfBooks(req.user.id).filter((b) => b.status === 'reading'),
    };
  }
  res.json(out);
});

app.get('/api/leaderboard', (req, res) => {
  const period = ['week', 'month', 'all'].includes(req.query.period) ? req.query.period : 'week';
  const metric = ['pages', 'books', 'streak'].includes(req.query.metric) ? req.query.metric : 'pages';
  const lb = leaderboard(period, metric);
  const strip = ({ id, ...r }) => r;
  const mine = req.user ? lb.all.find((r) => r.id === req.user.id) : null;
  res.json({ period, metric, rows: lb.rows.map(strip), me: mine ? strip(mine) : null });
});

// ---------- kitoblar ----------
app.get('/api/books', (req, res) => {
  const q = str(req.query.q, 60), genre = str(req.query.genre, 40);
  const where = [], params = [];
  if (q) { where.push(`(b.title LIKE ? OR b.author LIKE ?)`); params.push(`%${q}%`, `%${q}%`); }
  if (genre) { where.push(`b.genre=?`); params.push(genre); }
  const order = { rating: 'rating DESC NULLS LAST, readers DESC', new: 'b.id DESC', title: 'b.title' }[req.query.sort] || 'readers DESC, b.id';
  const books = all(`SELECT ${BOOK_COLS}, (SELECT status FROM shelves s WHERE s.book_id=b.id AND s.user_id=?) my_status
    FROM books b ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT 120`, uid(req), ...params);
  res.json({ books, genres: all(`SELECT genre, COUNT(*) n FROM books GROUP BY genre ORDER BY n DESC, genre`).map((g) => g.genre) });
});

app.post('/api/books', auth, (req, res) => {
  const title = str(req.body.title, 120), author = str(req.body.author, 80);
  const pages = int(req.body.pages, 1, 5000, 0);
  if (title.length < 1 || author.length < 2) return fail(res, 400, 'Kitob nomi va muallifini kiriting');
  if (!pages) return fail(res, 400, 'Sahifalar sonini kiriting');
  const dup = get(`SELECT id FROM books WHERE lower(title)=lower(?) AND lower(author)=lower(?)`, title, author);
  if (dup) return res.json({ id: dup.id, existed: true });
  const year = int(req.body.year, -3000, 2100, null);
  const r = run(`INSERT INTO books(title,author,pages,genre,year,description,hue,added_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
    title, author, pages, str(req.body.genre, 40) || 'Boshqa', year, str(req.body.description, 1200), hueOf(title), req.user.id, now());
  res.json({ id: Number(r.lastInsertRowid) });
});

app.get('/api/books/:id', (req, res) => {
  const me = uid(req);
  const book = get(`SELECT ${BOOK_COLS}, b.description FROM books b WHERE b.id=?`, req.params.id);
  if (!book) return fail(res, 404, 'Kitob topilmadi');
  res.json({
    book,
    shelf: get(`SELECT status,current_page,rating,review FROM shelves WHERE user_id=? AND book_id=?`, me, book.id) || null,
    counts: Object.fromEntries(all(`SELECT status, COUNT(*) n FROM shelves WHERE book_id=? GROUP BY status`, book.id).map((r) => [r.status, r.n])),
    reviews: all(`SELECT u.username,u.name,u.color,s.rating,s.review,s.updated_at FROM shelves s JOIN users u ON u.id=s.user_id
      WHERE s.book_id=? AND (s.rating>0 OR s.review<>'') ORDER BY (s.review<>'') DESC, s.updated_at DESC LIMIT 40`, book.id),
    readers: all(`SELECT u.username,u.name,u.color,s.status,s.current_page FROM shelves s JOIN users u ON u.id=s.user_id
      WHERE s.book_id=? ORDER BY s.updated_at DESC LIMIT 40`, book.id),
    posts: listPosts(me, 'p.book_id=?', [book.id]),
  });
});

const getBook = (id) => get(`SELECT id,pages,title FROM books WHERE id=?`, id);
const getShelf = (u, b) => get(`SELECT * FROM shelves WHERE user_id=? AND book_id=?`, u, b);

app.put('/api/books/:id/shelf', auth, (req, res) => {
  const book = getBook(req.params.id);
  if (!book) return fail(res, 404, 'Kitob topilmadi');
  const status = req.body.status;
  if (!['want', 'reading', 'done'].includes(status)) return fail(res, 400, 'Notoʻgʻri holat');
  const s = getShelf(req.user.id, book.id), t = now();
  const page = status === 'done' ? book.pages : status === 'want' ? 0 : s?.current_page >= book.pages ? 0 : s?.current_page || 0;
  const started = status === 'want' ? null : s?.started_at || t;
  const finished = status === 'done' ? s?.finished_at || t : null;
  if (s) run(`UPDATE shelves SET status=?,current_page=?,started_at=?,finished_at=?,updated_at=? WHERE user_id=? AND book_id=?`,
    status, page, started, finished, t, req.user.id, book.id);
  else run(`INSERT INTO shelves(user_id,book_id,status,current_page,started_at,finished_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
    req.user.id, book.id, status, page, started, finished, t);
  res.json({ shelf: getShelf(req.user.id, book.id) });
});

app.delete('/api/books/:id/shelf', auth, (req, res) => {
  run(`DELETE FROM shelves WHERE user_id=? AND book_id=?`, req.user.id, req.params.id);
  res.json({ ok: true });
});

app.post('/api/books/:id/progress', auth, (req, res) => {
  const book = getBook(req.params.id);
  if (!book) return fail(res, 404, 'Kitob topilmadi');
  const page = int(req.body.page, 0, book.pages, null);
  if (page === null) return fail(res, 400, 'Sahifa raqamini kiriting');
  const me = req.user.id, t = now(), day = today();
  const s = getShelf(me, book.id);
  const delta = page - (s?.status === 'done' ? book.pages : s?.current_page || 0);
  const finished = page >= book.pages;
  if (s) run(`UPDATE shelves SET status=?,current_page=?,started_at=COALESCE(started_at,?),finished_at=?,updated_at=? WHERE user_id=? AND book_id=?`,
    finished ? 'done' : 'reading', page, t, finished ? s.finished_at || t : null, t, me, book.id);
  else run(`INSERT INTO shelves(user_id,book_id,status,current_page,started_at,finished_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
    me, book.id, finished ? 'done' : 'reading', page, t, finished ? t : null, t);
  if (delta > 0) {
    run(`INSERT INTO reading_logs VALUES(?,?,?,?) ON CONFLICT(user_id,book_id,day) DO UPDATE SET pages=pages+excluded.pages`, me, book.id, day, delta);
  } else if (delta < 0) {
    // Xato kiritilgan sahifani tuzatish: faqat bugungi yozuvdan ayiriladi.
    run(`UPDATE reading_logs SET pages=MAX(0,pages+?) WHERE user_id=? AND book_id=? AND day=?`, delta, me, book.id, day);
  }
  const st = userStats(me);
  res.json({ added: Math.max(0, delta), finished: finished && s?.status !== 'done', today: st.today, goal: req.user.daily_goal, streak: st.streak, title: book.title });
});

app.put('/api/books/:id/review', auth, (req, res) => {
  const book = getBook(req.params.id);
  if (!book) return fail(res, 404, 'Kitob topilmadi');
  const rating = int(req.body.rating, 0, 5, 0), review = str(req.body.review, 1000), t = now();
  if (getShelf(req.user.id, book.id)) run(`UPDATE shelves SET rating=?,review=?,updated_at=? WHERE user_id=? AND book_id=?`, rating, review, t, req.user.id, book.id);
  else run(`INSERT INTO shelves(user_id,book_id,status,current_page,rating,review,finished_at,updated_at) VALUES(?,?,'done',?,?,?,?,?)`,
    req.user.id, book.id, book.pages, rating, review, t, t);
  res.json({ ok: true });
});

// ---------- xulosalar (postlar) ----------
app.get('/api/posts', (req, res) => {
  const me = uid(req), feed = req.query.feed;
  if (feed === 'following') return res.json({ posts: req.user ? listPosts(me, 'p.user_id IN (SELECT following_id FROM follows WHERE follower_id=?)', [me]) : [] });
  if (feed === 'saved') return res.json({ posts: req.user ? listPosts(me, 'p.id IN (SELECT post_id FROM bookmarks WHERE user_id=?)', [me]) : [] });
  if (feed === 'top') return res.json({ posts: listPosts(me, '1', [], 'likes DESC, comments DESC, p.created_at DESC') });
  res.json({ posts: listPosts(me) });
});

function postInput(req, res) {
  const title = str(req.body.title, 140), body = sanitize(req.body.body);
  const text = plain(body);
  if (title.length < 3) return fail(res, 400, 'Sarlavha juda qisqa'), null;
  if (text.length < 40) return fail(res, 400, 'Xulosa matni juda qisqa — kamida bir-ikki jumla yozing'), null;
  if (body.length > 120_000) return fail(res, 400, 'Matn juda uzun'), null;
  const bookId = req.body.book_id ? getBook(req.body.book_id)?.id ?? null : null;
  return {
    title, subtitle: str(req.body.subtitle, 200), body, bookId,
    excerpt: text.length > 240 ? text.slice(0, 240).replace(/\s+\S*$/, '') + '…' : text,
    readMin: Math.max(1, Math.round(text.split(' ').length / 180)),
  };
}

app.post('/api/posts', auth, (req, res) => {
  const p = postInput(req, res);
  if (!p) return;
  const r = run(`INSERT INTO posts(user_id,book_id,title,subtitle,body,excerpt,read_min,created_at) VALUES(?,?,?,?,?,?,?,?)`,
    req.user.id, p.bookId, p.title, p.subtitle, p.body, p.excerpt, p.readMin, now());
  res.json({ id: Number(r.lastInsertRowid) });
});

app.put('/api/posts/:id', auth, (req, res) => {
  if (!get(`SELECT 1 FROM posts WHERE id=? AND user_id=?`, req.params.id, req.user.id)) return fail(res, 404, 'Xulosa topilmadi');
  const p = postInput(req, res);
  if (!p) return;
  run(`UPDATE posts SET book_id=?,title=?,subtitle=?,body=?,excerpt=?,read_min=? WHERE id=?`,
    p.bookId, p.title, p.subtitle, p.body, p.excerpt, p.readMin, req.params.id);
  res.json({ id: Number(req.params.id) });
});

app.delete('/api/posts/:id', auth, (req, res) => {
  run(`DELETE FROM posts WHERE id=? AND user_id=?`, req.params.id, req.user.id);
  res.json({ ok: true });
});

app.get('/api/posts/:id', (req, res) => {
  const me = uid(req);
  const post = get(`SELECT ${POST_COLS}, p.body, u.bio, b.pages book_pages,
    EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.following_id=p.user_id) following
    ${POST_FROM} WHERE p.id=?`, me, me, me, req.params.id);
  if (!post) return fail(res, 404, 'Xulosa topilmadi');
  res.json({
    post,
    comments: all(`SELECT c.id,c.body,c.created_at,u.username,u.name,u.color FROM comments c JOIN users u ON u.id=c.user_id
      WHERE c.post_id=? ORDER BY c.id`, post.id),
    more: listPosts(me, 'u.username=? AND p.id<>?', [post.username, post.id]).slice(0, 3),
  });
});

const toggle = (table) => (req, res) => {
  if (!get(`SELECT 1 FROM posts WHERE id=?`, req.params.id)) return fail(res, 404, 'Xulosa topilmadi');
  const on = !get(`SELECT 1 FROM ${table} WHERE user_id=? AND post_id=?`, req.user.id, req.params.id);
  if (!on) run(`DELETE FROM ${table} WHERE user_id=? AND post_id=?`, req.user.id, req.params.id);
  else if (table === 'likes') run(`INSERT INTO likes VALUES(?,?)`, req.user.id, req.params.id);
  else run(`INSERT INTO bookmarks VALUES(?,?,?)`, req.user.id, req.params.id, now());
  res.json({ on, count: get(`SELECT COUNT(*) n FROM ${table} WHERE post_id=?`, req.params.id).n });
};
app.post('/api/posts/:id/like', auth, toggle('likes'));
app.post('/api/posts/:id/bookmark', auth, toggle('bookmarks'));

app.post('/api/posts/:id/comments', auth, (req, res) => {
  if (!get(`SELECT 1 FROM posts WHERE id=?`, req.params.id)) return fail(res, 404, 'Xulosa topilmadi');
  const body = str(req.body.body, 1000);
  if (!body) return fail(res, 400, 'Izoh boʻsh');
  const t = now();
  const r = run(`INSERT INTO comments(post_id,user_id,body,created_at) VALUES(?,?,?,?)`, req.params.id, req.user.id, body, t);
  res.json({ comment: { id: Number(r.lastInsertRowid), body, created_at: t, ...pub(req.user) } });
});

app.delete('/api/comments/:id', auth, (req, res) => {
  run(`DELETE FROM comments WHERE id=? AND user_id=?`, req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- profil ----------
const BADGES = [
  ['first', '📖', 'Ilk qadam', 'Birinchi kitobni tugatish', (s) => s.books >= 1],
  ['five', '📚', 'Javon egasi', '5 ta kitob oʻqish', (s) => s.books >= 5],
  ['ten', '🏛️', 'Kutubxonachi', '10 ta kitob oʻqish', (s) => s.books >= 10],
  ['p1k', '✨', 'Ming sahifa', '1 000 sahifa oʻqish', (s) => s.pages >= 1000],
  ['p5k', '🚀', 'Besh ming', '5 000 sahifa oʻqish', (s) => s.pages >= 5000],
  ['s7', '🔥', 'Bir hafta', '7 kun ketma-ket oʻqish', (s) => s.best >= 7],
  ['s30', '🌋', 'Temir iroda', '30 kun ketma-ket oʻqish', (s) => s.best >= 30],
  ['pen', '✍️', 'Qalam sohibi', 'Birinchi xulosani yozish', (s) => s.posts >= 1],
  ['loved', '💛', 'El suygan', 'Xulosalarga 10 ta yoqtirish olish', (s) => s.likes >= 10],
];

app.get('/api/users/:username', (req, res) => {
  const u = get(`SELECT * FROM users WHERE username=?`, String(req.params.username).toLowerCase());
  if (!u) return fail(res, 404, 'Foydalanuvchi topilmadi');
  const me = uid(req), stats = userStats(u.id), t = today();
  res.json({
    user: { ...pub(u), year_goal: u.year_goal, daily_goal: u.daily_goal },
    isMe: me === u.id,
    following: !!get(`SELECT 1 FROM follows WHERE follower_id=? AND following_id=?`, me, u.id),
    stats,
    heat: Object.fromEntries(all(`SELECT day, SUM(pages) n FROM reading_logs WHERE user_id=? AND day>=? GROUP BY day`,
      u.id, addDays(t, -200)).map((r) => [r.day, r.n])),
    today: t,
    badges: BADGES.map(([id, icon, title, desc, test]) => ({ id, icon, title, desc, earned: test(stats) })),
    shelf: shelfBooks(u.id),
    posts: listPosts(me, 'p.user_id=?', [u.id]),
  });
});

app.post('/api/users/:username/follow', auth, (req, res) => {
  const u = get(`SELECT id FROM users WHERE username=?`, String(req.params.username).toLowerCase());
  if (!u) return fail(res, 404, 'Foydalanuvchi topilmadi');
  if (u.id === req.user.id) return fail(res, 400, 'Oʻzingizga obuna boʻla olmaysiz');
  const on = !get(`SELECT 1 FROM follows WHERE follower_id=? AND following_id=?`, req.user.id, u.id);
  if (on) run(`INSERT INTO follows VALUES(?,?)`, req.user.id, u.id);
  else run(`DELETE FROM follows WHERE follower_id=? AND following_id=?`, req.user.id, u.id);
  res.json({ on, followers: get(`SELECT COUNT(*) n FROM follows WHERE following_id=?`, u.id).n });
});

// ---------- statik fayllar va SPA ----------
app.use('/api', (_req, res) => fail(res, 404, 'Topilmadi'));
app.use(express.static(path.join(dir, 'public'), { extensions: ['html'] }));
app.get(/.*/, (_req, res) => res.sendFile(path.join(dir, 'public', 'index.html')));
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return fail(res, 400, 'Soʻrov notoʻgʻri');
  console.error(err);
  fail(res, 500, 'Serverda xatolik yuz berdi');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Mutolaa: http://localhost:${port}`));
