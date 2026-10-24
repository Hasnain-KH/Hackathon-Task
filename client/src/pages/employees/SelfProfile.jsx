import { useEffect, useState } from 'react';
import api from '../../api/axios.js';
import Button from '../../components/ui/Button.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Input from '../../components/ui/Input.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage, apiFieldErrors } from '../../components/ui/useApiError.js';
import { formatDate } from '../../utils/format.js';

function Detail({ label, value }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm text-slate-800">{value || '—'}</dd></div>;
}

export default function SelfProfile() {
  const toast = useToast();
  const [employee, setEmployee] = useState(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    api.get('/employees/me')
      .then(({ data }) => {
        setEmployee(data.data);
        setPhone(data.data.phone || '');
        setAddress(data.data.address || '');
      })
      .catch((requestError) => setError(apiErrorMessage(requestError, 'Could not load your profile.')))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const { data } = await api.patch('/employees/me', { phone, address });
      setEmployee(data.data);
      toast('Your contact details were updated.');
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not update your contact details.'));
      setFieldErrors(apiFieldErrors(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading your employee profile" />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-bold text-ink">My profile</h1><p className="mt-1 text-sm text-slate-500">View your employee details and update your phone or address.</p></div>
      <ErrorBanner>{error}</ErrorBanner>
      {employee && <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-ink">Employment details</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <Detail label="Name" value={`${employee.firstName} ${employee.lastName}`} />
            <Detail label="Employee code" value={employee.employeeCode} />
            <Detail label="Email" value={employee.email} />
            <Detail label="Department" value={employee.departmentId?.name} />
            <Detail label="Designation" value={employee.designationId?.name} />
            <Detail label="Date joined" value={formatDate(employee.dateOfJoining)} />
          </dl>
        </section>
        <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-ink">Contact details</h2>
          <Input label="Phone" value={phone} error={fieldErrors.phone} onChange={(event) => setPhone(event.target.value)} />
          <label className="block text-sm font-medium text-slate-700">Address
            <textarea className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100 ${fieldErrors.address ? 'border-red-400' : 'border-slate-300'}`} rows="4" value={address} onChange={(event) => setAddress(event.target.value)} />
            {fieldErrors.address && <span className="mt-1 block text-xs text-red-600">{fieldErrors.address}</span>}
          </label>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save contact details'}</Button>
        </form>
      </div>}
    </div>
  );
}
