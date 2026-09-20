import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export function useMeetings(filters) {
  const [meetings, setMeetings] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filtersKey = JSON.stringify(filters);

  const reload = useCallback(() => {
    setLoading(true);
    api
      .getMeetings(JSON.parse(filtersKey))
      .then((data) => {
        setMeetings(data.meetings);
        setWarnings(data.warnings || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filtersKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { meetings, warnings, loading, error, reload };
}
