import React, { useState } from 'react';
import { useMeetings } from '../hooks/useMeetings.js';
import MeetingCard from '../components/MeetingCard.jsx';

export default function MeetingListPage() {
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { meetings, warnings, loading, error } = useMeetings({ q, dateFrom, dateTo });

  return (
    <div className="page">
      <h1>会議一覧</h1>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="キーワード検索（タイトル・本文）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label>
          開始日
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          終了日
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </div>

      {warnings.length > 0 && (
        <div className="warning-banner">
          <strong>読み込みに失敗した会議があります（一覧には表示されません）:</strong>
          <ul>
            {warnings.map((w, i) => (
              <li key={`${w.dir}-${i}`}>
                {w.dir}: {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && <div className="hint">読み込み中...</div>}
      {error && <div className="error-text">{error}</div>}
      {!loading && !error && meetings.length === 0 && <div className="empty-state">会議がありません</div>}

      <div className="meeting-list">
        {meetings.map((m) => (
          <MeetingCard key={m.meetingId} meeting={m} />
        ))}
      </div>
    </div>
  );
}
