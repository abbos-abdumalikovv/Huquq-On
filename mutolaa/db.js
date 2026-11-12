import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const file = process.env.DB_PATH || path.join(dir, 'data', 'mutolaa.db');
fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '', pass_hash TEXT NOT NULL, salt TEXT NOT NULL,
  color INTEGER NOT NULL DEFAULT 20, daily_goal INTEGER NOT NULL DEFAULT 20,
  year_goal INTEGER NOT NULL DEFAULT 12, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS books(
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, pages INTEGER NOT NULL,
  genre TEXT NOT NULL DEFAULT 'Boshqa', year INTEGER, description TEXT NOT NULL DEFAULT '',
  hue INTEGER NOT NULL DEFAULT 20, added_by INTEGER, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shelves(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('want','reading','done')),
  current_page INTEGER NOT NULL DEFAULT 0, rating INTEGER NOT NULL DEFAULT 0,
  review TEXT NOT NULL DEFAULT '', started_at TEXT, finished_at TEXT, updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, book_id));
CREATE TABLE IF NOT EXISTS reading_logs(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  day TEXT NOT NULL, pages INTEGER NOT NULL,
  PRIMARY KEY(user_id, book_id, day));
CREATE INDEX IF NOT EXISTS logs_day ON reading_logs(day);
CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '', body TEXT NOT NULL,
  excerpt TEXT NOT NULL, read_min INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS likes(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id, post_id));
CREATE TABLE IF NOT EXISTS bookmarks(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, post_id));
CREATE TABLE IF NOT EXISTS comments(
  id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS follows(
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(follower_id, following_id));
`);

export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const get = (sql, ...p) => db.prepare(sql).get(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);

// Kunlar Toshkent vaqti bo'yicha hisoblanadi (seriya yarim tunda uzilmasligi uchun).
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' });
export const today = (d = new Date()) => fmt.format(d);
export const addDays = (day, n) => {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const hueOf = (s) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.codePointAt(0)) % 360;
  return h;
};
export const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, 32).toString('hex');
