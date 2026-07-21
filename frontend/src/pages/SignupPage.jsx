import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup as signupApi } from '../api/endpoints';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', mobileNumber: '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await signupApi(form);
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed.';
      // Friendly copy for whitelist rejection
      if (msg.toLowerCase().includes('not whitelisted') || msg.toLowerCase().includes('not authorized')) {
        setError('Email not authorized. Contact Admin.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (id, label, name, type = 'text', placeholder = '') => (
    <div>
      <label className="input-label">{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        required
        placeholder={placeholder}
        value={form[name]}
        onChange={handleChange}
        className="input-field"
        autoComplete="off"
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐷</div>
          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="text-slate-500 text-sm mt-1">Join your company's carpool network</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span className="mt-0.5">⚠️</span><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <span className="mt-0.5">✅</span><span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {field('signup-firstname', 'First Name', 'firstName', 'text', 'Jane')}
              {field('signup-lastname',  'Last Name',  'lastName',  'text', 'Doe')}
            </div>
            {field('signup-email',    'Work Email',    'email',        'email', 'you@company.com')}
            {field('signup-mobile',   'Mobile Number', 'mobileNumber', 'tel',   '+91 98765 43210')}
            {field('signup-password', 'Password',      'password',     'password', '••••••••')}

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
