import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import NavBar from './components/NavBar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MeetingListPage from './pages/MeetingListPage.jsx';
import MeetingDetailPage from './pages/MeetingDetailPage.jsx';
import TaskListPage from './pages/TaskListPage.jsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="page-loading">読み込み中...</div>;
  if (user === null) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user ? <NavBar /> : null}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/meetings"
            element={
              <RequireAuth>
                <MeetingListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/meetings/:meetingId"
            element={
              <RequireAuth>
                <MeetingDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/tasks"
            element={
              <RequireAuth>
                <TaskListPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/meetings" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
