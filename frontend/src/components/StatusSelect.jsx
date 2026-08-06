import React from 'react';

const LABELS = {
  not_started: '未着手',
  in_progress: '対応中',
  done: '完了',
};

export default function StatusSelect({ value, onChange, disabled }) {
  return (
    <select
      className={`status-select status-${value}`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {Object.entries(LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
