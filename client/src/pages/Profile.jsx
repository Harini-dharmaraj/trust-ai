import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FiUser, FiMail, FiShield, FiCheckCircle, FiBell, FiCheckSquare, FiActivity, FiLock } from 'react-icons/fi';
import { loginSuccess } from '../features/auth/authSlice';

function Profile() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'member',
  });

  // Stateful real in-app preferences
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('trustcircle-preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      liveAlerts: true,
      votingAlerts: true,
      ledgerAlerts: true,
      onlinePresence: true,
    };
  });

  const [prefMessage, setPrefMessage] = useState('');

  const togglePreference = (key) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('trustcircle-preferences', JSON.stringify(updated));
      setPrefMessage('Security preference updated!');
      setTimeout(() => setPrefMessage(''), 2500);
      return updated;
    });
  };

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'member',
      });
    }
  }, [user]);

  const [message, setMessage] = useState('');

  const handleUpdate = (e) => {
    e.preventDefault();
    const updatedUser = { ...user, name: form.name, email: form.email, role: form.role };
    localStorage.setItem('trustcircle-user', JSON.stringify(updatedUser));
    dispatch(loginSuccess({ token, user: updatedUser }));
    setMessage('Profile settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <FiUser /> Account & Security Configuration
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Profile & Governance Settings</h2>
        <p className="text-xs text-slate-500">
          Manage your personal account credentials, role permissions (Member, Group Admin, Super Admin), and real-time governance alert preferences.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        {/* Profile Edit Form Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Account Details</h3>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 pl-10 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 p-3 pl-10 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Account Role</label>
              <div className="relative">
                <FiShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  className="w-full rounded-xl border border-slate-200 p-3 pl-10 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="member">Member (Pay Dues & Vote)</option>
                  <option value="admin">Group Admin (Create Expenses & Proposals)</option>
                  <option value="superadmin">Super Admin (Platform Control)</option>
                </select>
              </div>
            </div>

            {message && (
              <p className="rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                {message}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-xs text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* In-App Notification Preferences Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
                <p className="text-xs text-slate-500">Choose what notifications you want to receive inside the app</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                In-App
              </span>
            </div>

            {prefMessage && (
              <p className="mb-3 rounded-xl bg-emerald-50 p-2 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 animate-fadeIn">
                ✓ {prefMessage}
              </p>
            )}

            <div className="space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div className="flex items-center gap-2.5">
                  <FiBell className="text-blue-600" size={16} />
                  <div>
                    <span className="block font-bold">Chat & Payment Alerts</span>
                    <span className="text-[10px] text-slate-400 font-normal">Show instant alerts when a member sends a message or makes a payment</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.liveAlerts}
                  onChange={() => togglePreference('liveAlerts')}
                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div className="flex items-center gap-2.5">
                  <FiCheckSquare className="text-emerald-600" size={16} />
                  <div>
                    <span className="block font-bold">Group Voting Alerts</span>
                    <span className="text-[10px] text-slate-400 font-normal">Get notified when someone creates a new vote or poll</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.votingAlerts}
                  onChange={() => togglePreference('votingAlerts')}
                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div className="flex items-center gap-2.5">
                  <FiLock className="text-amber-600" size={16} />
                  <div>
                    <span className="block font-bold">Expense & Bill Alerts</span>
                    <span className="text-[10px] text-slate-400 font-normal">Get notified when a new expense or verified receipt is added</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.ledgerAlerts}
                  onChange={() => togglePreference('ledgerAlerts')}
                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div className="flex items-center gap-2.5">
                  <FiActivity className="text-purple-600" size={16} />
                  <div>
                    <span className="block font-bold">Show When I'm Online</span>
                    <span className="text-[10px] text-slate-400 font-normal">Show a green dot next to your name when you are in group chat</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.onlinePresence}
                  onChange={() => togglePreference('onlinePresence')}
                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Preferences are automatically saved</span>
            <span className="font-bold text-emerald-600">✓ Saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
