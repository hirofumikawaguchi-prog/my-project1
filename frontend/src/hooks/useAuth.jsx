import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

// 7.5章: 簡易ユーザー識別（本格認証は行わない）。ログイン中のユーザー名を
// アプリ全体で参照できるようContextで保持する。
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined: 判定中 / null: 未ログイン
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api
      .getUsers()
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]));
    api
      .getMe()
      .then((data) => setUser(data.username))
      .catch(() => setUser(null));
  }, []);

  const login = useCallback(async (username) => {
    const data = await api.login(username);
    setUser(data.username);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, users, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth は AuthProvider の内部で使用してください');
  return ctx;
}
