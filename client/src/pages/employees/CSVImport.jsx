import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Table from '../../components/ui/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';
import { useAuth } from '../../context/AuthContext.jsx';

const templateHeaders = 'employeeCode,firstName,lastName,email,phone,dateOfJoining,employmentType,departmentCode,designationName,basic,hra,medical,transport,other';

export default function CSVImport() {
  const { user } = useAuth();
  const employeePath = user?.role === 'admin' ? '/admin/employees' : '/hr/employees';
  const toast = useToast();
  const fileInput = useRef(null);
  const [csv, setCsv] = useState('');
  const [report, setReport] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setCsv(await file.text());
      setReport(null);
      setCredentials(null);
      setError('');
    } catch {
      setError('Could not read the selected file.');
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([`${templateHeaders}\r\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'employee-import-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const submit = async (dryRun) => {
    setLoading(true);
    setError('');
    setCredentials(null);
    try {
      const { data } = await api.post('/employees/import', { csv, dryRun });
      if (dryRun) {
        setReport(data.data);
        toast('CSV dry run completed.');
      } else {
        setCredentials(data.data);
        setReport(null);
        toast(`${data.data.created} employees imported.`);
      }
    } catch (requestError) {
      if (requestError.response?.data?.report) {
        setReport(requestError.response.data.report);
      } else if (Array.isArray(requestError.response?.data?.rows)) {
        setReport(requestError.response.data);
      }
      setError(apiErrorMessage(requestError, 'CSV import failed.'));
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    const text = credentials.tempPasswords.map((item) => `${item.employeeCode}: ${item.tempPassword}`).join('\n');
    await navigator.clipboard.writeText(text);
    toast('All temporary passwords copied.');
  };

  const columns = [
    { key: 'rowNumber', label: 'CSV row' },
    { key: 'code', label: 'Employee code', render: (row) => row.data?.employeeCode || '—' },
    { key: 'name', label: 'Name', render: (row) => row.data ? `${row.data.firstName} ${row.data.lastName}` : '—' },
    { key: 'result', label: 'Result', render: (row) => row.errors.length ? <Badge tone="red">Invalid</Badge> : <Badge tone="green">Valid</Badge> },
    { key: 'errors', label: 'Errors', render: (row) => row.errors.length ? <ul className="space-y-1 text-xs text-red-700">{row.errors.map((item, index) => <li key={`${item.field}-${index}`}><strong>{item.field}:</strong> {item.message}</li>)}</ul> : '—' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to={employeePath} className="text-sm font-semibold text-brand hover:underline">← Employee directory</Link>
      <div>
        <h1 className="text-2xl font-bold text-ink">Import employees from CSV</h1>
        <p className="mt-1 text-sm text-slate-500">Run a dry-run preview first. Commit is all-or-nothing when validation fails.</p>
      </div>
      {user?.role !== 'hr' ? <ErrorBanner>CSV imports are available to HR users only.</ErrorBanner> : <>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={downloadTemplate}>Download sample template</Button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={selectFile} />
        <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>Choose CSV file</Button>
        <span className="text-xs text-slate-500">Required: {templateHeaders}</span>
      </div>
      <label className="block text-sm font-medium text-slate-700">Paste CSV
        <textarea className="mt-1.5 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-700 outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100" value={csv} onChange={(event) => { setCsv(event.target.value); setReport(null); setCredentials(null); }} placeholder={templateHeaders} />
      </label>
      <ErrorBanner>{error}</ErrorBanner>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled={loading || !csv.trim()} onClick={() => submit(true)}>Dry Run</Button>
        <Button type="button" disabled={loading || !csv.trim() || !report || report.invalid > 0} onClick={() => submit(false)}>Commit import</Button>
        {loading && <span className="self-center text-sm text-slate-500">Processing CSV…</span>}
      </div>
      {loading && <Loader label="Processing employee CSV" />}

      {report && <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Preview: {report.valid} valid · {report.invalid} invalid · {report.total} total</h2>
        {!report.rows.length ? <EmptyState title="No CSV data rows" description="Add rows below the header before running the dry run." /> : <Table rows={report.rows} rowKey="rowNumber" columns={columns} />}
      </section>}

      {credentials && <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-semibold text-amber-950">Import completed — {credentials.created} employees created</h2><p className="mt-1 text-sm text-amber-900">Copy and securely share each initial password. They will not be shown again.</p></div>
          <Button type="button" variant="secondary" onClick={copyAll}>Copy all passwords</Button>
        </div>
        <Table rows={credentials.tempPasswords} columns={[
          { key: 'employeeCode', label: 'Employee code' },
          { key: 'tempPassword', label: 'Temporary password', render: (item) => <code>{item.tempPassword}</code> },
        ]} />
      </section>}
      </>}
    </div>
  );
}
