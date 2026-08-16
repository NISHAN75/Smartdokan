import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordRequest } from '../api/authApi';

const ForgotPassword = () => {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (e) => { e.preventDefault(); setError(''); setMessage(''); setLoading(true); try { const r = await forgotPasswordRequest(email); setMessage(r.message); } catch (err) { setError(err.response?.data?.message || 'Could not process the request.'); } finally { setLoading(false); } };
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm"><h1 className="mb-2 text-2xl font-semibold text-slate-900">Forgot password?</h1><p className="mb-6 text-sm text-slate-500">Enter your email and we&apos;ll send a reset link.</p>{message && <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}{error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}<form onSubmit={submit} className="space-y-4"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /><button disabled={loading} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{loading ? 'Sending...' : 'Send reset link'}</button></form><p className="mt-4 text-center text-sm"><Link to="/login" className="font-medium text-indigo-600 hover:underline">Back to sign in</Link></p></div></div>;
};
export default ForgotPassword;
