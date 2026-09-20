import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function LoginPage() {
  const { user, users, login } = useAuth();
  const [selected, setSelected] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/meetings" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) {
      setError('ユーザー名を選択してください');
      return;
    }
    setSubmitting(true);
    try {
      await login(selected);
      navigate('/meetings');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>議事録・タスク管理</h1>
        <p>ログインするユーザー名を選択してください</p>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">-- 選択してください --</option>
          {users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}
