import { useEffect, useState } from 'react';
import api from '../../api/axios.js';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import Select from '../ui/Select.jsx';
import { apiErrorMessage, apiFieldErrors } from '../ui/useApiError.js';
import { useAuth } from '../../context/AuthContext.jsx';
import SmartLeaveBox from '../ai/SmartLeaveBox.jsx';

export default function ApplyLeaveModal({ onClose, onApplied }) {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [preview, setPreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    api.get('/leave-types').then(({ data }) => setLeaveTypes(data.items.filter((item) => item.isActive)))
      .catch((requestError) => setError(apiErrorMessage(requestError, 'Could not load leave types.')));
  }, []);

  useEffect(() => {
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      setPreview(null);
      return undefined;
    }
    let active = true;
    setPreviewLoading(true);
    api.get('/leave/preview', { params: { from: form.startDate, to: form.endDate } })
      .then(({ data }) => { if (active) setPreview(data.data); })
      .catch((requestError) => { if (active) setError(apiErrorMessage(requestError, 'Could not preview working days.')); })
      .finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; };
  }, [form.startDate, form.endDate]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      await api.post('/leave/requests', form);
      onApplied();
      onClose();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not submit leave request.'));
      setFieldErrors(apiFieldErrors(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Apply for leave" onClose={onClose} onConfirm={submit} confirmLabel="Submit request" loading={loading}>
      <div className="space-y-4">
        <ErrorBanner>{error}</ErrorBanner>
        {user?.role === 'employee' && <SmartLeaveBox onPrefill={(values) => setForm({
          leaveTypeId: values.leaveTypeId,
          startDate: values.startDate,
          endDate: values.endDate,
          reason: values.reason,
        })} />}
        <Select label="Leave type" value={form.leaveTypeId} error={fieldErrors.leaveTypeId} onChange={(event) => setField('leaveTypeId', event.target.value)}>
          <option value="">Select leave type</option>
          {leaveTypes.map((type) => <option key={type._id} value={type._id}>{type.name} · {type.quotaPerYear === 0 ? 'Unlimited' : `${type.quotaPerYear} days/year`}</option>)}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start date" type="date" value={form.startDate} error={fieldErrors.startDate} onChange={(event) => setField('startDate', event.target.value)} />
          <Input label="End date" type="date" value={form.endDate} error={fieldErrors.endDate} onChange={(event) => setField('endDate', event.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Reason
            <textarea rows="3" maxLength="500" value={form.reason} onChange={(event) => setField('reason', event.target.value)} className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100 ${fieldErrors.reason ? 'border-red-400' : 'border-slate-300'}`} />
          </label>
          {fieldErrors.reason && <span className="mt-1 block text-xs text-red-600">{fieldErrors.reason}</span>}
        </div>
        {previewLoading && <p className="text-sm text-slate-500">Calculating working days…</p>}
        {preview && <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
          <p><strong>{preview.days}</strong> working days requested.</p>
          <p className="mt-1 text-xs">Excluded weekends: {preview.weekends.length} · holidays: {preview.holidaysInRange.length}</p>
        </div>}
      </div>
    </Modal>
  );
}
