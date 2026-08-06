const crypto = require('crypto');

// 7.5章: パスワード認証は行わず、ユーザー名選択による簡易セッション管理とする。
// セッションはサーバーのメモリ上に保持し、DB等は導入しない。
const SESSION_COOKIE = 'mtg_sid';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30日

const sessions = new Map(); // sid -> { username, createdAt }

function attachSession(req, res, next) {
  const sid = req.cookies?.[SESSION_COOKIE];
  const session = sid ? sessions.get(sid) : undefined;
  req.session = session ? { id: sid, ...session } : null;
  next();
}

function createSession(res, username) {
  const sid = crypto.randomUUID();
  sessions.set(sid, { username, createdAt: new Date().toISOString() });
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
  });
  return sid;
}

function destroySession(req, res) {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) sessions.delete(sid);
  res.clearCookie(SESSION_COOKIE);
}

function requireAuth(req, res, next) {
  if (!req.session?.username) {
    return res.status(401).json({ error: 'ログインが必要です' });
  }
  next();
}

module.exports = { attachSession, createSession, destroySession, requireAuth, SESSION_COOKIE };
