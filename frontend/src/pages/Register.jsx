import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const Register = () => {
  const { register, registerStatus } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await register(form);
      navigate('/login', { replace: true, state: { message: result.message || 'Registration successful. Check your email to verify your account.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mb-6 text-sm text-slate-500">Get started with SmartDokan</p>
        {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Full name</label><input type="text" name="name" required value={form.name} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Email</label><input type="email" name="email" required value={form.email} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Password</label><input type="password" name="password" required minLength={6} value={form.password} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
          <button type="submit" disabled={registerStatus.isPending} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{registerStatus.isPending ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-medium text-indigo-600 hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
};

export default Register;
