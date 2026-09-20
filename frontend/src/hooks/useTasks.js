import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export function useTasks(filters) {
  const [tasks, setTasks] = useState([]);
  const [dueSoonDays, setDueSoonDays] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filtersKey = JSON.stringify(filters);

  const reload = useCallback(() => {
    setLoading(true);
    api
      .getTasks(JSON.parse(filtersKey))
      .then((data) => {
        setTasks(data.tasks);
        setDueSoonDays(data.dueSoonDays);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filtersKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateStatus = useCallback(
    async (meetingId, taskId, status) => {
      await api.updateTaskStatus(meetingId, taskId, status);
      reload();
    },
    [reload]
  );

  return { tasks, dueSoonDays, loading, error, reload, updateStatus };
}
