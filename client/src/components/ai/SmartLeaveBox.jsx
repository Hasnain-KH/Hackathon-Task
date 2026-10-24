import { useState } from 'react';
import api from '../../api/axios.js';
import Button from '../ui/Button.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';
import AiBadge from './AiBadge.jsx';

export default function SmartLeaveBox({ onPrefill }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fill = async () => {
    if (!text.trim()) {
      setError('Describe the leave you need, then try again.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/ai/smart-leave', { text: text.trim() }, { timeout: 15000 });
      onPrefill(data.form);
      setSuccess('Leave form filled. Review it and submit manually when ready.');
    } catch (requestError) {
      const retryAfter = Number(requestError.response?.headers?.['retry-after']);
      const message = requestError.response?.status === 422
        ? 'Could not understand — please fill manually.'
        : requestError.response?.status === 429 && retryAfter
          ? `AI rate limit reached. Try again in about ${Math.ceil(retryAfter / 60)} minute(s).`
          : apiErrorMessage(requestError, 'Could not fill the leave form with AI.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">Describe your leave</h3><AiBadge /></div>
      <p className="mt-1 text-xs text-slate-600">AI will pre-fill the form only. It will not submit your request.</p>
      <label className="mt-3 block text-sm font-medium text-slate-700">What do you need time off for?
        <textarea rows="2" maxLength="2000" value={text} onChange={(event) => setText(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100" placeholder="I need next Monday and Tuesday off for a wedding" />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" disabled={loading} onClick={fill}>{loading ? 'Preparing…' : 'Fill form with AI'}</Button>{success && <p className="text-xs text-emerald-700">{success}</p>}</div>
      <div className="mt-3"><ErrorBanner>{error}</ErrorBanner></div>
    </section>
  );
}
