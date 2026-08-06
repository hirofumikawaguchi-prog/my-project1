import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import MarkdownEditor from '../components/MarkdownEditor.jsx';
import TaskRow from '../components/TaskRow.jsx';

export default function MeetingDetailPage() {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getMeeting(meetingId)
      .then((data) => {
        setMeeting(data.meeting);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveMinutes = async (body) => {
    setSaving(true);
    try {
      await api.updateMinutes(meetingId, body);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task, status) => {
    try {
      await api.updateTaskStatus(meetingId, task.id, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page hint">読み込み中...</div>;
  if (error) return <div className="page error-text">{error}</div>;
  if (!meeting) return null;

  return (
    <div className="page">
      <Link to="/meetings" className="back-link">
        ← 会議一覧に戻る
      </Link>
      <h1>{meeting.title}</h1>
      <div className="meeting-meta">
        <span>
          {meeting.date} {meeting.startTime}
          {meeting.endTime ? `–${meeting.endTime}` : ''}
        </span>
        <span>主催: {meeting.organizer}</span>
        <span>参加者: {(meeting.attendees || []).join('、')}</span>
        {meeting.source && <span>ソース: {meeting.source}</span>}
      </div>
      {meeting.updatedAt && (
        <div className="meeting-updated">
          最終更新: {meeting.updatedAt}（{meeting.updatedBy}）
        </div>
      )}

      <section>
        <h2>議事録</h2>
        <MarkdownEditor value={meeting.body} onSave={handleSaveMinutes} saving={saving} />
      </section>

      <section>
        <h2>タスク一覧</h2>
        {meeting.tasks.length === 0 ? (
          <div className="empty-state">タスクはありません</div>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>タスク</th>
                <th>担当者</th>
                <th>期限</th>
                <th>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {meeting.tasks.map((t) => (
                <TaskRow key={t.id} task={t} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
