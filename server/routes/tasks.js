const express = require('express');
const { requireAuth } = require('../middleware/session');
const { computeDueStatus } = require('../utils/dueStatus');

function createTasksRouter(store, config) {
  const router = express.Router();
  router.use(requireAuth);

  // 7.4章: 全会議横断タスク一覧（担当者・ステータス・期限でのフィルタ・ソート）
  router.get('/', (req, res) => {
    const { q, assignee, status, dueFrom, dueTo, sort } = req.query;
    let tasks = store.getAllTasks();

    if (q) {
      const keyword = String(q).toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(keyword));
    }
    if (assignee) tasks = tasks.filter((t) => t.assignee === assignee);
    if (status) tasks = tasks.filter((t) => t.status === status);
    if (dueFrom) tasks = tasks.filter((t) => t.dueDate >= dueFrom);
    if (dueTo) tasks = tasks.filter((t) => t.dueDate <= dueTo);

    const today = new Date();
    tasks = tasks.map((t) => ({
      ...t,
      dueStatus: computeDueStatus(t.dueDate, t.status, config.dueSoonDays, today),
    }));

    const sortKey = sort || 'dueDate';
    tasks.sort((a, b) => {
      if (sortKey === 'status') return a.status.localeCompare(b.status);
      if (sortKey === 'assignee') return a.assignee.localeCompare(b.assignee);
      return a.dueDate.localeCompare(b.dueDate);
    });

    res.json({ tasks, dueSoonDays: config.dueSoonDays });
  });

  // 7.4章: タスクのステータス更新（updatedBy/updatedAtを記録し、tasks.jsonへ書き戻す）
  router.patch('/:meetingId/:taskId', (req, res, next) => {
    try {
      const { status } = req.body || {};
      const task = store.updateTaskStatus(req.params.meetingId, req.params.taskId, status, req.session.username);
      res.json({ task });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createTasksRouter };
