import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import EmployeeForm from './EmployeeForm.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';
import EmployeeLeaveTab from '../../components/leave/EmployeeLeaveTab.jsx';

function Detail({ label, children }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm text-slate-800">{children || '—'}</dd></div>;
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const employeePath = user?.role === 'admin' ? '/admin/employees' : '/hr/employees';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/employees/${id}`);
      setEmployee(data.data);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load employee profile.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <Loader label="Loading employee profile" />;
  if (error) return <div className="space-y-4"><ErrorBanner>{error}</ErrorBanner><Link to={employeePath} className="text-sm font-semibold text-brand">Back to employees</Link></div>;
  if (!employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const gross = (employee.salary?.basic || 0) * 1.5;

  return (
    <div className="space-y-5">
      <Link to={employeePath} className="text-sm font-semibold text-brand hover:underline">← Employee directory</Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-brand">
            {employee.firstName[0]}{employee.lastName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-ink">{fullName}</h1><Badge tone={employee.status === 'active' ? 'green' : employee.status === 'probation' ? 'amber' : 'slate'}>{employee.status}</Badge></div>
            <p className="mt-1 text-sm text-slate-500">{employee.employeeCode} · {employee.email}</p>
            <p className="mt-1 text-sm text-slate-600">{employee.departmentId?.name} · {employee.designationId?.name}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>Edit profile</Button>
        </div>
        <div className="mt-5 border-b border-slate-200">
          <nav className="-mb-px flex gap-5 overflow-x-auto" aria-label="Employee profile tabs">
            {['Overview', 'Salary', 'Leave', 'Attendance'].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold ${tab === item ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-ink'}`}>{item}</button>)}
          </nav>
        </div>

        {tab === 'Overview' && <dl className="grid gap-x-8 gap-y-6 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Employee code">{employee.employeeCode}</Detail>
          <Detail label="Email">{employee.email}</Detail>
          <Detail label="Phone">{employee.phone}</Detail>
          <Detail label="Address">{employee.address}</Detail>
          <Detail label="Gender">{employee.gender?.replaceAll('_', ' ')}</Detail>
          <Detail label="Date of birth">{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'}</Detail>
          <Detail label="Date joined">{new Date(employee.dateOfJoining).toLocaleDateString()}</Detail>
          <Detail label="Employment type">{employee.employmentType?.replaceAll('_', ' ')}</Detail>
          <Detail label="Department">{employee.departmentId?.name}</Detail>
          <Detail label="Designation">{employee.designationId?.name}</Detail>
          <Detail label="Reporting to">{employee.reportingTo ? `${employee.reportingTo.firstName} ${employee.reportingTo.lastName}` : '—'}</Detail>
        </dl>}
        {tab === 'Salary' && <dl className="grid gap-x-8 gap-y-6 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Basic">{employee.salary.basic}</Detail>
          <Detail label="HRA">{employee.salary.hra}</Detail>
          <Detail label="Medical allowance">{employee.salary.medical}</Detail>
          <Detail label="Transport allowance">{employee.salary.transport}</Detail>
          <Detail label="Other allowance">{employee.salary.other}</Detail>
          <Detail label="Gross (1.5 × basic)">{gross.toFixed(2)}</Detail>
        </dl>}
        {tab === 'Leave' && <EmployeeLeaveTab employeeId={employee._id} />}
        {tab === 'Attendance' && <p className="py-12 text-center text-sm text-slate-500">Coming soon.</p>}
      </section>
      {editing && <EmployeeForm employee={employee} onClose={() => setEditing(false)} onSaved={load} />}
    </div>
  );
}
