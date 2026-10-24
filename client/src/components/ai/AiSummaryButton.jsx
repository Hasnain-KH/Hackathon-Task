import { useState } from 'react';
import api from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';
import AiBadge from './AiBadge.jsx';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Loader from '../ui/Loader.jsx';
import Modal from '../ui/Modal.jsx';

export default function AiSummaryButton({ feature, filters = {} }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bullets, setBullets] = useState([]);

  const summarize = async () => {
    setOpen(true);
    setLoading(true);
    setError('');
    setBullets([]);
    try {
      const { data } = await api.post('/ai/summary', { feature, filters }, { timeout: 15000 });
      setBullets(data.bullets || []);
    } catch (requestError) {
      const retryAfter = Number(requestError.response?.headers?.['retry-after']);
      const message = requestError.response?.status === 429 && retryAfter
        ? `AI rate limit reached. Try again in about ${Math.ceil(retryAfter / 60)} minute(s).`
        : apiErrorMessage(requestError, 'Could not generate an AI summary.');
      setError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="secondary" onClick={summarize}>Summarize with AI</Button>
      {open && <Modal title="Dashboard insights" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div className="flex justify-end"><AiBadge /></div>
          <ErrorBanner>{error}</ErrorBanner>
          {loading ? <Loader label="Generating dashboard insights" /> : bullets.length
            ? <ul className="space-y-3">{bullets.map((bullet, index) => <li key={`${index}-${bullet}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700"><AiBadge /><p className="mt-2">{bullet}</p></li>)}</ul>
            : !error && <EmptyState title="No summary available" description="Try again after dashboard data is available." />}
        </div>
      </Modal>}
    </>
  );
}
