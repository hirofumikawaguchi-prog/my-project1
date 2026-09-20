import React from 'react';
import { Link } from 'react-router-dom';

export default function MeetingCard({ meeting }) {
  return (
    <Link to={`/meetings/${encodeURIComponent(meeting.meetingId)}`} className="meeting-card">
      <div className="meeting-card-header">
        <span className="meeting-date">
          {meeting.date} {meeting.startTime}
          {meeting.endTime ? `–${meeting.endTime}` : ''}
        </span>
        {meeting.incompleteTaskCount > 0 && (
          <span className="badge badge-due_soon">未完了タスク {meeting.incompleteTaskCount}</span>
        )}
      </div>
      <div className="meeting-title">{meeting.title}</div>
      <div className="meeting-attendees">参加者: {(meeting.attendees || []).join('、')}</div>
    </Link>
  );
}
