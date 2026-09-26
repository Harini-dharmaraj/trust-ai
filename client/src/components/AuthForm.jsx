import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowRight, FiCheck, FiMail, FiLock, FiUser, FiShield, FiKey } from 'react-icons/fi';
import { loginSuccess } from '../features/auth/authSlice';

function AuthForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(endpoint, form);
      const { token, user } = response.data;
      localStorage.setItem('trustcircle-token', token);
      localStorage.setItem('trustcircle-user', JSON.stringify(user));
      dispatch(loginSuccess({ token, user }));
      setMessage(`${mode === 'login' ? 'Logged in' : 'Registered'} successfully`);
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Server connection error. Please verify the backend is active.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: '🛡️', text: 'SHA-256 Cryptographic Audit Ledger' },
    { icon: '🤖', text: 'AI Receipt OCR & Fraud Risk Scoring' },
    { icon: '🗳️', text: 'Democratic Multi-Sig Voting Governance' },
    { icon: '📊', text: 'Recharts Financial Analytics & PDF Export' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="mb-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 hover:text-white transition"
          >
            ← Back to Home Page
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2">TrustCircle AI</h1>
          <p className="text-sm text-blue-100 mt-1">Community Money Management with Transparency, Trust & AI</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* Left Feature Column */}
          <div className="space-y-4">
            <div className="rounded-3xl bg-white/10 p-6 backdrop-blur border border-white/20 shadow-2xl text-white">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">Portfolio & Enterprise Ready</span>
              <h2 className="text-2xl font-bold mt-2">Transparent Finance Architecture</h2>
              <div className="mt-6 space-y-4">
                {features.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-sm font-medium text-blue-50">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900">
            {/* Mode Switcher */}
            <div className="mb-6 flex gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setMessage('');
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
                  mode === 'login' ? 'bg-white text-blue-600 shadow-md dark:bg-slate-700 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setMessage('');
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
                  mode === 'register' ? 'bg-white text-blue-600 shadow-md dark:bg-slate-700 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Create Account
              </button>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              {mode === 'login' ? 'Welcome Back' : 'Join TrustCircle AI'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {mode === 'login' ? 'Enter credentials or click a Quick Demo persona.' : 'Register a new profile and select your community role.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="e.g. Asha Sharma"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Account Role</label>
                  <div className="relative">
                    <FiShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                    >
                      <option value="member">Member (Pay & Vote)</option>
                      <option value="admin">Group Admin (Create Expenses & Proposals)</option>
                      <option value="superadmin">Super Admin (Platform Control)</option>
                    </select>
                  </div>
                </div>
              )}

              {message && (
                <div className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-bold text-white shadow-lg transition hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In to Workspace' : 'Create Profile'}
                <FiArrowRight />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;
