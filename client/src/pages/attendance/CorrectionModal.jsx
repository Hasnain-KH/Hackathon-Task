import { useState } from 'react';
import api from '../../api/axios.js';
import Button from '../../components/ui/Button.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Select from '../../components/ui/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

const requestTypes = [
  ['fix_missing_checkin', 'Fix missing check-in'],
  ['fix_missing_checkout', 'Fix missing check-out'],
  ['mark_half_day', 'Mark half day'],
  ['mark_present', 'Mark present'],
  ['mark_on_leave', 'Mark on leave'],
  ['mark_absent', 'Mark absent'],
];

export default function CorrectionModal({ date, onClose, onSubmitted }) {
  const toast = useToast();
  const [requestType, setRequestType] = useState('fix_missing_checkin');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      await api.post('/attendance/corrections', { date, requestType, reason });
      toast('Correction request submitted.');
      onSubmitted?.();
      onClose();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not submit correction request.'));
      const details = requestError.response?.data?.details || [];
      setFieldErrors(Object.fromEntries(details.map(({ field, msg }) => [field, msg])));
      toast(apiErrorMessage(requestError, 'Could not submit correction request.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Request attendance correction · ${date}`} onClose={onClose} onConfirm={() => document.getElementById('correction-form')?.requestSubmit()} confirmLabel="Submit request" loading={loading}>
      <form id="correction-form" className="space-y-4" onSubmit={submit}>
        <Select label="Correction type" value={requestType} error={fieldErrors.requestType} onChange={(event) => setRequestType(event.target.value)}>
          {requestTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <label className="block text-sm font-medium text-slate-700">Reason
          <textarea className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100 ${fieldErrors.reason ? 'border-red-400' : 'border-slate-300'}`} rows="4" minLength="5" maxLength="500" required value={reason} onChange={(event) => setReason(event.target.value)} />
          {fieldErrors.reason && <span className="mt-1 block text-xs text-red-600">{fieldErrors.reason}</span>}
        </label>
        <ErrorBanner>{error}</ErrorBanner>
        <p className="text-xs text-slate-500">Requests can be made for today or a past date. HR will review the request.</p>
      </form>
      <div className="hidden"><Button type="submit" form="correction-form">Submit</Button></div>
    </Modal>
  );
}
