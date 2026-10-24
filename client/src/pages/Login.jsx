import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { roleHome } from '../components/ProtectedRoute.jsx';
import { AuthPage, FormError, FormField, SubmitButton } from './Setup.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
      navigate(data.user.mustChangePassword ? '/change-password' : roleHome(data.user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage eyebrow="WELCOME BACK" title="Sign in" description="Use your HCM Lite account to continue.">
      <form className="space-y-4" onSubmit={submit}>
        <FormField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <FormField label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <FormError>{error}</FormError>
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New to HCM Lite? <Link className="font-semibold text-brand hover:underline" to="/setup">Set up your company</Link>
      </p>
    </AuthPage>
  );
}
