import React, { useMemo, useState } from 'react';
import { useTasks } from '../hooks/useTasks.js';
import TaskRow from '../components/TaskRow.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'not_started', label: '未着手' },
  { value: 'in_progress', label: '対応中' },
  { value: 'done', label: '完了' },
];

export default function TaskListPage() {
  const [q, setQ] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('dueDate');
  const { tasks, loading, error, updateStatus, dueSoonDays } = useTasks({ q, assignee, status, sort });

  const assignees = useMemo(() => Array.from(new Set(tasks.map((t) => t.assignee))).sort(), [tasks]);

  const handleStatusChange = (task, newStatus) => {
    updateStatus(task.meetingId, task.id, newStatus);
  };

  return (
    <div className="page">
      <h1>タスク一覧（全会議横断）</h1>
      <p className="hint">期限が本日から{dueSoonDays}日以内、または期限超過のタスクをハイライトしています。</p>

      <div className="filter-bar">
        <input type="text" placeholder="キーワード検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">担当者: すべて</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              ステータス: {o.label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="dueDate">期限で並び替え</option>
          <option value="status">ステータスで並び替え</option>
          <option value="assignee">担当者で並び替え</option>
        </select>
      </div>

      {loading && <div className="hint">読み込み中...</div>}
      {error && <div className="error-text">{error}</div>}
      {!loading && !error && tasks.length === 0 && <div className="empty-state">タスクがありません</div>}

      {tasks.length > 0 && (
        <table className="task-table">
          <thead>
            <tr>
              <th>タスク</th>
              <th>担当者</th>
              <th>期限</th>
              <th>ステータス</th>
              <th>会議</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <TaskRow key={`${t.meetingId}-${t.id}`} task={t} onStatusChange={handleStatusChange} showMeeting />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
