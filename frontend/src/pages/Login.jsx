import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { resendVerificationRequest } from '../api/authApi';

const Login = () => {
  const { login, loginStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [resendLoading, setResendLoading] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      await login(form);
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
      if (err.response?.status === 403 && msg.toLowerCase().includes('verify')) setMessage('Your email is not verified yet. You can resend the verification email below.');
    }
  };

  const resendVerification = async () => {
    if (!form.email) { setError('Enter your email address first.'); return; }
    setError(''); setMessage(''); setResendLoading(true);
    try { const result = await resendVerificationRequest(form.email); setMessage(result.message); }
    catch (err) { setError(err.response?.data?.message || 'Could not resend verification email.'); }
    finally { setResendLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mb-6 text-sm text-slate-500">Welcome back to SmartDokan</p>
        {message && <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
        {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Email</label><input type="email" name="email" required value={form.email} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Password</label><input type="password" name="password" required value={form.password} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
          <button type="submit" disabled={loginStatus.isPending} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{loginStatus.isPending ? 'Signing in...' : 'Sign in'}</button>
        </form>
        {error.toLowerCase().includes('verify') && <button type="button" onClick={resendVerification} disabled={resendLoading} className="mt-3 w-full text-sm font-medium text-indigo-600 hover:underline">{resendLoading ? 'Sending...' : 'Resend verification email'}</button>}
        <div className="mt-4 flex justify-between text-sm"><Link to="/forgot-password" className="font-medium text-indigo-600 hover:underline">Forgot password?</Link><Link to="/register" className="font-medium text-indigo-600 hover:underline">Register</Link></div>
      </div>
    </div>
  );
};

export default Login;
