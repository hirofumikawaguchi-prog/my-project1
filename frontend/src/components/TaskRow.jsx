import React from 'react';
import { Link } from 'react-router-dom';
import StatusSelect from './StatusSelect.jsx';
import DueBadge from './DueBadge.jsx';

export default function TaskRow({ task, onStatusChange, showMeeting }) {
  return (
    <tr className={`task-row due-${task.dueStatus || 'normal'}`}>
      <td>{task.title}</td>
      <td>{task.assignee}</td>
      <td className="task-due-cell">
        {task.dueDate} <DueBadge dueStatus={task.dueStatus} />
      </td>
      <td>
        <StatusSelect value={task.status} onChange={(status) => onStatusChange(task, status)} />
      </td>
      {showMeeting && (
        <td>
          <Link to={`/meetings/${encodeURIComponent(task.meetingId)}`}>{task.meetingTitle}</Link>
        </td>
      )}
    </tr>
  );
}
