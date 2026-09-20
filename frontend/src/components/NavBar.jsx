import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">議事録・タスク管理</div>
      <nav className="navbar-links">
        <NavLink to="/meetings" className={({ isActive }) => (isActive ? 'active' : '')}>
          会議一覧
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => (isActive ? 'active' : '')}>
          タスク一覧
        </NavLink>
      </nav>
      <div className="navbar-user">
        <span className="navbar-username">{user}</span>
        <button type="button" onClick={handleLogout}>
          ログアウト
        </button>
      </div>
    </header>
  );
}
