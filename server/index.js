const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { loadConfig } = require('./utils/config');
const { MeetingStore } = require('./store/meetingStore');
const { attachSession } = require('./middleware/session');
const { errorHandler } = require('./middleware/errorHandler');
const { createAuthRouter } = require('./routes/auth');
const { createMeetingsRouter } = require('./routes/meetings');
const { createTasksRouter } = require('./routes/tasks');

const config = loadConfig();

const store = new MeetingStore(config);
store.scanAll();
store.startWatching();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(attachSession);

app.use('/api/auth', createAuthRouter(config));
app.use('/api/meetings', createMeetingsRouter(store, config));
app.use('/api/tasks', createTasksRouter(store, config));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'APIエンドポイントが見つかりません' });
});

// 本番運用時: `npm run build` 済みの frontend/dist を静的配信する
const frontendDist = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`議事録・タスク管理サーバーを起動しました: http://localhost:${config.port}`);
  console.log(`meetings フォルダ: ${config.meetingsPath}`);
});
