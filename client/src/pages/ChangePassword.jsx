import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { roleHome } from '../components/ProtectedRoute.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthPage, FormError, FormField, SubmitButton } from './Setup.jsx';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      const user = await refreshMe();
      navigate(roleHome(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Password update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage eyebrow="ACCOUNT SECURITY" title="Change your password" description="Choose a new password with at least 8 characters.">
      <form className="space-y-4" onSubmit={submit}>
        <FormField label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        <FormField label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
        <FormError>{error}</FormError>
        <SubmitButton loading={loading}>Update password</SubmitButton>
      </form>
    </AuthPage>
  );
}
