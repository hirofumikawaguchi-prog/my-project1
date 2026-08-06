import React from 'react';

const LABELS = {
  overdue: '期限超過',
  due_soon: '期限間近',
};

export default function DueBadge({ dueStatus }) {
  if (!dueStatus || !LABELS[dueStatus]) return null;
  return <span className={`badge badge-${dueStatus}`}>{LABELS[dueStatus]}</span>;
}
