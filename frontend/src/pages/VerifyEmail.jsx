import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmailRequest } from '../api/authApi';

const VerifyEmail = () => {
  const [params] = useSearchParams(); const token = params.get('token') || ''; const [status, setStatus] = useState('verifying'); const [message, setMessage] = useState('');
  useEffect(() => { if (!token) { setStatus('error'); setMessage('Verification token is missing.'); return; } verifyEmailRequest(token).then((r) => { setStatus('success'); setMessage(r.message); }).catch((err) => { setStatus('error'); setMessage(err.response?.data?.message || 'Verification failed.'); }); }, [token]);
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm"><h1 className="mb-2 text-2xl font-semibold text-slate-900">Email verification</h1><p className={status === 'error' ? 'text-sm text-red-600' : status === 'success' ? 'text-sm text-green-700' : 'text-sm text-slate-500'}>{status === 'verifying' ? 'Verifying your email...' : message}</p>{status !== 'verifying' && <Link to="/login" className="mt-6 inline-block font-medium text-indigo-600 hover:underline">Go to sign in</Link>}</div></div>;
};
export default VerifyEmail;
