import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios.js';
import Button from '../../components/ui/Button.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Select from '../../components/ui/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage, apiFieldErrors } from '../../components/ui/useApiError.js';

const emptyForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  gender: '',
  dateOfBirth: '',
  dateOfJoining: '',
  employmentType: 'full_time',
  status: 'active',
  departmentId: '',
  designationId: '',
  reportingTo: '',
  salary: { basic: '', hra: 0, medical: 0, transport: 0, other: 0 },
};

function inputDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export default function EmployeeForm({ employee = null, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerSearch, setManagerSearch] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [credential, setCredential] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/departments', { params: { limit: 100, isActive: true } })
      .then(({ data }) => setDepartments(data.items))
      .catch((requestError) => setError(apiErrorMessage(requestError, 'Could not load departments.')));
  }, []);

  useEffect(() => {
    if (!employee) {
      setForm(emptyForm);
      return;
    }
    setForm({
      ...emptyForm,
      ...employee,
      dateOfBirth: inputDate(employee.dateOfBirth),
      dateOfJoining: inputDate(employee.dateOfJoining),
      departmentId: employee.departmentId?._id || employee.departmentId || '',
      designationId: employee.designationId?._id || employee.designationId || '',
      reportingTo: employee.reportingTo?._id || employee.reportingTo || '',
      salary: { ...emptyForm.salary, ...employee.salary },
    });
    setManagerSearch(employee.reportingTo ? `${employee.reportingTo.firstName || ''} ${employee.reportingTo.lastName || ''}`.trim() : '');
  }, [employee]);

  useEffect(() => {
    if (!form.departmentId) {
      setDesignations([]);
      return;
    }
    api.get('/designations', { params: { departmentId: form.departmentId, limit: 100 } })
      .then(({ data }) => setDesignations(data.items.filter((item) => item.isActive || item._id === form.designationId)))
      .catch((requestError) => setError(apiErrorMessage(requestError, 'Could not load designations.')));
  }, [form.departmentId, form.designationId]);

  useEffect(() => {
    if (!managerSearch.trim()) {
      setManagers([]);
      return;
    }
    let active = true;
    api.get('/employees', { params: { q: managerSearch, limit: 10, status: 'active' } })
      .then(({ data }) => {
        if (active) setManagers(data.items.filter((item) => item._id !== employee?._id));
      })
      .catch((requestError) => {
        if (active) setError(apiErrorMessage(requestError, 'Could not search employees.'));
      });
    return () => { active = false; };
  }, [managerSearch, employee?._id]);

  const gross = useMemo(() => Number(form.salary.basic || 0) * 1.5, [form.salary.basic]);
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const updateSalary = (name, value) => setForm((current) => ({ ...current, salary: { ...current.salary, [name]: value } }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    const payload = {
      ...(employee ? {} : { employeeCode: form.employeeCode }),
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      dateOfJoining: form.dateOfJoining,
      employmentType: form.employmentType,
      status: form.status,
      departmentId: form.departmentId,
      designationId: form.designationId,
      reportingTo: form.reportingTo || undefined,
      salary: Object.fromEntries(Object.entries(form.salary).map(([key, value]) => [key, Number(value || 0)])),
    };

    try {
      if (employee) {
        await api.patch(`/employees/${employee._id}`, payload);
        toast('Employee profile updated.');
        onSaved?.();
        onClose();
      } else {
        const { data } = await api.post('/employees', payload);
        setCredential(data);
        onSaved?.();
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not save employee.'));
      setFieldErrors(apiFieldErrors(requestError));
    } finally {
      setSaving(false);
    }
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(credential.tempPassword);
    setCopied(true);
    toast('Temporary password copied.');
  };

  return (
    <Modal
      title={credential ? 'Employee login created' : employee ? 'Edit employee' : 'Register employee'}
      onClose={onClose}
      onConfirm={credential ? undefined : () => document.getElementById('employee-form')?.requestSubmit()}
      confirmLabel={employee ? 'Save changes' : 'Create employee'}
      loading={saving}
    >
      {credential ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">Employee record and login were created. Share this temporary password securely.</p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Temporary password</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded bg-white px-3 py-2 text-sm text-ink">{credential.tempPassword}</code>
              <Button type="button" variant="secondary" onClick={copyPassword}>{copied ? 'Copied' : 'Copy'}</Button>
            </div>
            <p className="mt-3 text-xs font-medium text-amber-900">Share with employee — will not be shown again.</p>
          </div>
          <Button type="button" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form id="employee-form" onSubmit={save} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <ErrorBanner>{error}</ErrorBanner>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-bold text-ink">Personal information</legend>
            <Input label="Employee code" value={form.employeeCode} disabled={Boolean(employee)} required error={fieldErrors.employeeCode} onChange={(event) => update('employeeCode', event.target.value.toUpperCase())} />
            <Input label="First name" value={form.firstName} required error={fieldErrors.firstName} onChange={(event) => update('firstName', event.target.value)} />
            <Input label="Last name" value={form.lastName} required error={fieldErrors.lastName} onChange={(event) => update('lastName', event.target.value)} />
            <Input label="Email" type="email" value={form.email} required error={fieldErrors.email} onChange={(event) => update('email', event.target.value)} />
            <Input label="Phone" value={form.phone} error={fieldErrors.phone} onChange={(event) => update('phone', event.target.value)} />
            <Input label="Date of birth" type="date" value={form.dateOfBirth} error={fieldErrors.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} />
            <Select label="Gender" value={form.gender} error={fieldErrors.gender} onChange={(event) => update('gender', event.target.value)}>
              <option value="">Select gender</option>
              {['male', 'female', 'other', 'prefer_not_to_say'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
            </Select>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Address
              <textarea className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100 ${fieldErrors.address ? 'border-red-400' : 'border-slate-300'}`} rows="2" value={form.address} onChange={(event) => update('address', event.target.value)} />
              {fieldErrors.address && <span className="mt-1 block text-xs text-red-600">{fieldErrors.address}</span>}
            </label>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-bold text-ink">Employment</legend>
            <Input label="Date of joining" type="date" value={form.dateOfJoining} required error={fieldErrors.dateOfJoining} onChange={(event) => update('dateOfJoining', event.target.value)} />
            <Select label="Employment type" value={form.employmentType} error={fieldErrors.employmentType} onChange={(event) => update('employmentType', event.target.value)}>
              {['full_time', 'part_time', 'contract', 'intern'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
            </Select>
            {employee && <Select label="Status" value={form.status} error={fieldErrors.status} onChange={(event) => update('status', event.target.value)}>
              {['active', 'probation', 'resigned', 'terminated'].map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>}
            <Select label="Department" value={form.departmentId} required error={fieldErrors.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value, designationId: '' })}>
              <option value="">Select department</option>
              {departments.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.code})</option>)}
            </Select>
            <Select label="Designation" value={form.designationId} required error={fieldErrors.designationId} onChange={(event) => update('designationId', event.target.value)}>
              <option value="">Select designation</option>
              {designations.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </Select>
            <div className="sm:col-span-2">
              <Input label="Reporting to (search by name, email, or code)" value={managerSearch} error={fieldErrors.reportingTo} onChange={(event) => { setManagerSearch(event.target.value); update('reportingTo', ''); }} />
              {managers.length > 0 && <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                {managers.map((manager) => <button key={manager._id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { update('reportingTo', manager._id); setManagerSearch(`${manager.firstName} ${manager.lastName} (${manager.employeeCode})`); setManagers([]); }}>{manager.firstName} {manager.lastName} · {manager.employeeCode}</button>)}
              </div>}
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-bold text-ink">Salary structure</legend>
            {[
              ['basic', 'Basic salary', 1],
              ['hra', 'HRA', 0],
              ['medical', 'Medical allowance', 0],
              ['transport', 'Transport allowance', 0],
              ['other', 'Other allowance', 0],
            ].map(([key, label, min]) => (
              <Input key={key} label={label} type="number" min={min} step="0.01" required={key === 'basic'} value={form.salary[key]} error={fieldErrors[`salary.${key}`] || fieldErrors.salary} onChange={(event) => updateSalary(key, event.target.value)} />
            ))}
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900 sm:col-span-2">Gross (per rule: 1.5 × basic): <strong>{gross.toFixed(2)}</strong></div>
          </fieldset>
          {!employee && <p className="text-xs text-slate-500">A temporary password will be generated automatically. It will be displayed only once after creation.</p>}
          <ErrorBanner>{error}</ErrorBanner>
        </form>
      )}
    </Modal>
  );
}
