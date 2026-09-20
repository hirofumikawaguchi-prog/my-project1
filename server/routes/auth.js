const express = require('express');
const { createSession, destroySession } = require('../middleware/session');

function createAuthRouter(config) {
  const router = express.Router();

  // ログイン画面用のユーザー一覧（設定ファイルで管理）
  router.get('/users', (req, res) => {
    res.json({ users: config.users });
  });

  router.get('/me', (req, res) => {
    if (!req.session?.username) {
      return res.status(401).json({ error: 'ログインしていません' });
    }
    res.json({ username: req.session.username });
  });

  router.post('/login', (req, res) => {
    const { username } = req.body || {};
    if (!username || !config.users.includes(username)) {
      return res.status(400).json({ error: '有効なユーザー名を選択してください' });
    }
    createSession(res, username);
    res.json({ username });
  });

  router.post('/logout', (req, res) => {
    destroySession(req, res);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAuthRouter };
