import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import AnnouncementCard from './AnnouncementCard.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Loader from '../ui/Loader.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';

export default function LatestAnnouncements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/announcements?limit=3');
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load announcements.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return <section className="space-y-3">
    {error && <ErrorBanner>{error} <button type="button" className="ml-2 font-semibold underline" onClick={load}>Retry</button></ErrorBanner>}
    {loading ? <Loader label="Loading announcements" /> : <AnnouncementCard items={items} />}
  </section>;
}
