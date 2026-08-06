const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `リクエストに失敗しました (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

function toQueryString(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== '' && value != null);
  return new URLSearchParams(entries).toString();
}

export const api = {
  getUsers: () => request('/auth/users'),
  getMe: () => request('/auth/me'),
  login: (username) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  getMeetings: (params) => request(`/meetings?${toQueryString(params)}`),
  getMeeting: (meetingId) => request(`/meetings/${encodeURIComponent(meetingId)}`),
  updateMinutes: (meetingId, body) =>
    request(`/meetings/${encodeURIComponent(meetingId)}/minutes`, {
      method: 'PUT',
      body: JSON.stringify({ body }),
    }),

  getTasks: (params) => request(`/tasks?${toQueryString(params)}`),
  updateTaskStatus: (meetingId, taskId, status) =>
    request(`/tasks/${encodeURIComponent(meetingId)}/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
