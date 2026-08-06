const express = require('express');
const { requireAuth } = require('../middleware/session');
const { computeDueStatus } = require('../utils/dueStatus');

function toSummary(meeting) {
  return {
    meetingId: meeting.meetingId,
    title: meeting.title,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    attendees: meeting.attendees,
    organizer: meeting.organizer,
    incompleteTaskCount: meeting.tasks.filter((t) => t.status !== 'done').length,
    taskCount: meeting.tasks.length,
  };
}

function createMeetingsRouter(store, config) {
  const router = express.Router();
  router.use(requireAuth);

  // 7.2章: 会議一覧（日付降順、キーワード検索・日付範囲での絞り込み）
  router.get('/', (req, res) => {
    const { q, dateFrom, dateTo } = req.query;
    let meetings = store.getAllMeetings();

    if (q) {
      const keyword = String(q).toLowerCase();
      meetings = meetings.filter(
        (m) => m.title.toLowerCase().includes(keyword) || m.body.toLowerCase().includes(keyword)
      );
    }
    if (dateFrom) meetings = meetings.filter((m) => m.date >= dateFrom);
    if (dateTo) meetings = meetings.filter((m) => m.date <= dateTo);

    // meetingId は YYYYMMDD-HHMMSS_slug 形式のため、そのまま降順ソートで日付降順になる
    meetings = [...meetings].sort((a, b) => (a.meetingId < b.meetingId ? 1 : -1));

    res.json({ meetings: meetings.map(toSummary), warnings: store.getWarnings() });
  });

  // 7.2章: 会議詳細（議事録本文・当該会議のタスク一覧）
  router.get('/:meetingId', (req, res) => {
    const meeting = store.getMeeting(req.params.meetingId);
    if (!meeting) return res.status(404).json({ error: '会議が見つかりません' });

    const today = new Date();
    const tasks = meeting.tasks.map((task) => ({
      ...task,
      dueStatus: computeDueStatus(task.dueDate, task.status, config.dueSoonDays, today),
    }));

    res.json({
      meeting: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        attendees: meeting.attendees,
        organizer: meeting.organizer,
        source: meeting.source,
        updatedAt: meeting.updatedAt,
        updatedBy: meeting.updatedBy,
        body: meeting.body,
        tasks,
      },
    });
  });

  // 7.3章: 議事録の軽微編集（フロントマターは保持し、updatedAt/updatedByを更新）
  router.put('/:meetingId/minutes', (req, res, next) => {
    try {
      const { body } = req.body || {};
      if (typeof body !== 'string') {
        return res.status(400).json({ error: 'body は文字列で指定してください' });
      }
      const meeting = store.updateMinutesBody(req.params.meetingId, body, req.session.username);
      res.json({ meeting: { updatedAt: meeting.updatedAt, updatedBy: meeting.updatedBy, body: meeting.body } });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createMeetingsRouter };
