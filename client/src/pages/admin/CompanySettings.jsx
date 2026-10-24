import { useEffect, useState } from 'react';
import api from '../../api/axios.js';
import Button from '../../components/ui/Button.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Input from '../../components/ui/Input.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage, apiFieldErrors } from '../../components/ui/useApiError.js';

const defaults = {
  companyName: '',
  officeStart: '09:00',
  graceMinutes: 15,
  halfDayThresholdHours: 5,
  weekendDays: [0, 6],
  officeLat: '',
  officeLng: '',
  officeRadiusMeters: 150,
};

const fields = [
  ['companyName', 'Company name', 'text'],
  ['officeStart', 'Office start (HH:mm)', 'time'],
  ['graceMinutes', 'Grace minutes', 'number'],
  ['halfDayThresholdHours', 'Half-day threshold (hours)', 'number'],
  ['officeLat', 'Office latitude', 'number'],
  ['officeLng', 'Office longitude', 'number'],
  ['officeRadiusMeters', 'Office radius (meters)', 'number'],
];

export default function CompanySettings() {
  const toast = useToast();
  const [form, setForm] = useState(defaults);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/company')
      .then(({ data }) => {
        const settings = data.data;
        setForm({
          companyName: settings.companyName || '',
          officeStart: settings.officeStart || '09:00',
          graceMinutes: settings.graceMinutes ?? 15,
          halfDayThresholdHours: settings.halfDayThresholdHours ?? 5,
          weekendDays: settings.weekendDays || [],
          officeLat: settings.officeLat ?? '',
          officeLng: settings.officeLng ?? '',
          officeRadiusMeters: settings.officeRadiusMeters ?? 150,
        });
      })
      .catch((requestError) => setError(apiErrorMessage(requestError, 'Could not load company settings.')))
      .finally(() => setLoading(false));
  }, []);

  const updateWeekend = (day, checked) => {
    setForm((current) => ({
      ...current,
      weekendDays: checked
        ? [...new Set([...current.weekendDays, day])].sort()
        : current.weekendDays.filter((value) => value !== day),
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setErrors({});
    const patch = {
      ...form,
      graceMinutes: Number(form.graceMinutes),
      halfDayThresholdHours: Number(form.halfDayThresholdHours),
      officeRadiusMeters: Number(form.officeRadiusMeters),
      weekendDays: form.weekendDays.map(Number),
    };
    if (patch.officeLat === '') patch.officeLat = null;
    else patch.officeLat = Number(patch.officeLat);
    if (patch.officeLng === '') patch.officeLng = null;
    else patch.officeLng = Number(patch.officeLng);

    try {
      const { data } = await api.patch('/company', patch);
      setForm((current) => ({ ...current, ...data.data, officeLat: data.data.officeLat ?? '', officeLng: data.data.officeLng ?? '' }));
      toast('Company settings saved.');
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not save company settings.'));
      setErrors(apiFieldErrors(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading company settings" />;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Company settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure company profile and office schedule defaults.</p>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, type]) => (
            <div key={name}>
              <Input
                label={label}
                type={type}
                min={name === 'graceMinutes' ? 0 : name === 'halfDayThresholdHours' ? 1 : name === 'officeRadiusMeters' ? 10 : undefined}
                max={name === 'graceMinutes' ? 60 : name === 'halfDayThresholdHours' ? 12 : name === 'officeRadiusMeters' ? 1000 : undefined}
                step={name === 'halfDayThresholdHours' ? 0.5 : 'any'}
                value={form[name]}
                error={errors[name]}
                required={!['officeLat', 'officeLng'].includes(name)}
                onChange={(event) => setForm({ ...form, [name]: event.target.value })}
              />
              {name === 'officeLng' && <p className="mt-2 text-xs text-indigo-800">Camera attendance requires these coordinates + radius. Leave blank to disable camera check-in.</p>}
            </div>
          ))}
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Weekend days</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, value) => (
              <label key={day} className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.weekendDays.includes(value)} onChange={(event) => updateWeekend(value, event.target.checked)} />
                {day}
              </label>
            ))}
          </div>
          {errors.weekendDays && <p className="mt-1 text-xs text-red-600">{errors.weekendDays}</p>}
        </fieldset>
        <p className="text-xs text-slate-500">Office latitude and longitude are plain numeric inputs; map selection can be added later.</p>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
      </form>
    </div>
  );
}
