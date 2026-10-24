import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Setup() {
  const [form, setForm] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/setup/status')
      .then(({ data }) => setInitialized(data.initialized))
      .catch((requestError) => setError(requestError.response?.data?.error || 'Could not check setup status.'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/setup/init', form);
      login(data.token, data.user);
      navigate('/admin', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Company setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageMessage>Checking company setup…</PageMessage>;
  if (initialized) return <Navigate to="/login" replace />;

  return (
    <AuthPage
      eyebrow="FIRST-RUN SETUP"
      title="Create your workspace"
      description="Set up your company and create its first administrator account."
    >
      <form className="space-y-4" onSubmit={submit}>
        <FormField label="Company name" name="companyName" value={form.companyName} onChange={updateField} required />
        <FormField label="Admin name" name="adminName" value={form.adminName} onChange={updateField} required />
        <FormField label="Admin email" name="adminEmail" type="email" value={form.adminEmail} onChange={updateField} required />
        <FormField
          label="Admin password"
          name="adminPassword"
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={form.adminPassword}
          onChange={updateField}
          required
        />
        <FormError>{error}</FormError>
        <SubmitButton loading={submitting}>Create company</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already set up? <Link className="font-semibold text-brand hover:underline" to="/login">Sign in</Link>
      </p>
    </AuthPage>
  );
}

export function AuthPage({ eyebrow, title, description, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-9">
        <Brand />
        <p className="mt-8 text-xs font-bold tracking-[0.16em] text-brand">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 mb-7 text-sm leading-6 text-slate-500">{description}</p>
        {children}
      </section>
    </main>
  );
}

export function FormField({ label, name, type = 'text', ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-indigo-100"
        name={name}
        type={type}
        {...props}
      />
    </label>
  );
}

export function FormError({ children }) {
  return children ? <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">{children}</p> : null;
}

export function SubmitButton({ loading, children }) {
  return (
    <button
      className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
      disabled={loading}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function PageMessage({ children }) {
  return <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">{children}</main>;
}

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">H</span>
      <span className="text-lg font-bold tracking-tight text-ink">HCM Lite</span>
    </div>
  );
}
