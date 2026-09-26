import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  FiBarChart2, FiBookOpen, FiDollarSign, FiMessageSquare, 
  FiBell, FiUsers, FiCheckSquare, FiCpu, FiUser, FiMenu, 
  FiLogOut, FiMoon, FiSun, FiShield, FiLayers, FiCheckCircle 
} from 'react-icons/fi';
import { logout } from '../features/auth/authSlice';
import AuditLedgerModal from './AuditLedgerModal';

function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('trustcircle-theme') || 'light');
  const [showAuditModal, setShowAuditModal] = useState(false);
  
  // Real active group states
  const [myGroups, setMyGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('trustcircle-theme', theme);
  }, [theme]);

  // Fetch groups dynamically
  const fetchMyGroups = async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyGroups(response.data);
      
      // Auto-set the first group as active if none is set
      if (response.data.length > 0 && !localStorage.getItem('trustcircle-active-group')) {
        const firstGroupId = response.data[0]._id;
        setActiveGroupId(firstGroupId);
        localStorage.setItem('trustcircle-active-group', firstGroupId);
        window.dispatchEvent(new Event('trustcircle-active-group-changed'));
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  const fetchUnreadNotifs = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const unread = (res.data || []).filter(n => !n.read).length;
      setUnreadNotifs(unread);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMyGroups();

    // Listen for events that might update group directory
    window.addEventListener('trustcircle-group-created', fetchMyGroups);
    return () => window.removeEventListener('trustcircle-group-created', fetchMyGroups);
  }, [token]);

  useEffect(() => {
    fetchUnreadNotifs();

    const socket = io(window.location.origin);
    if (activeGroupId) {
      socket.emit('join_group', activeGroupId);
    }
    socket.on('new_notification', () => {
      setUnreadNotifs(prev => prev + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, [token, activeGroupId]);

  const handleGroupChange = (groupId) => {
    setActiveGroupId(groupId);
    localStorage.setItem('trustcircle-active-group', groupId);
    window.dispatchEvent(new Event('trustcircle-active-group-changed'));
  };

  const handleLogout = () => {
    localStorage.removeItem('trustcircle-token');
    localStorage.removeItem('trustcircle-user');
    localStorage.removeItem('trustcircle-active-group');
    dispatch(logout());
    navigate('/auth');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: FiBarChart2 },
    { to: '/dashboard/groups', label: 'Groups', icon: FiBookOpen },
    { to: '/dashboard/payments', label: 'Payments', icon: FiDollarSign },
    { to: '/dashboard/expenses', label: 'Expenses', icon: FiCheckSquare },
    { to: '/dashboard/members', label: 'Members', icon: FiUsers },
    { to: '/dashboard/voting', label: 'Voting', icon: FiCheckSquare },
    { to: '/dashboard/analytics', label: 'Analytics', icon: FiBarChart2 },
    { to: '/dashboard/ai', label: 'AI Assistant', icon: FiCpu },
    { to: '/dashboard/notifications', label: 'Notifications', icon: FiBell },
    { to: '/dashboard/chat', label: 'Chat', icon: FiMessageSquare },
    { to: '/dashboard/profile', label: 'Profile', icon: FiUser },
  ];

  if (user?.role === 'superadmin' || !user) {
    navItems.push({ to: '/dashboard/admin', label: 'Super Admin', icon: FiShield });
  }

  const activeGroup = myGroups.find(g => g._id === activeGroupId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Mobile Backdrop */}
        <div
          className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition ${mobileOpen ? 'block lg:hidden' : 'hidden'}`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur transition-transform dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:translate-x-0 lg:border-b-0 lg:border-r lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-lg shadow-md">
                T
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">TrustCircle AI</p>
                <h1 className="text-base font-bold leading-tight">Community Money</h1>
              </div>
            </div>
            <button className="rounded-full border border-slate-200 p-2 text-slate-500 lg:hidden" onClick={() => setMobileOpen(false)}>
              <FiMenu size={18} />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Active Workspace</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase backdrop-blur">
                {user?.role || 'Member'}
              </span>
            </div>
            <p className="mt-2 text-base font-bold truncate">{user?.name || 'User Profile'}</p>
            <p className="text-xs text-blue-100 truncate">{user?.email || 'user@trustcircle.ai'}</p>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  {label}
                </div>
                {to === '/dashboard/notifications' && unreadNotifs > 0 && (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    {unreadNotifs}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Logout Action */}
          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <span className="flex items-center gap-2">
                <FiLogOut size={16} /> Sign Out
              </span>
              <span className="text-xs font-semibold text-rose-400">Exit</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Top Bar Header */}
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button className="rounded-full border border-slate-200 p-2 text-slate-600 lg:hidden dark:border-slate-700 dark:text-slate-300" onClick={() => setMobileOpen(true)}>
                  <FiMenu size={18} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <FiCheckCircle size={12} /> Realtime Sync
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">SHA-256 Ledger Active</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {activeGroup ? activeGroup.name : 'Select or Create a Group'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* Real-time Group Switcher Dropdown */}
                {myGroups.length > 0 ? (
                  <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                    <FiLayers className="ml-2 text-slate-400" size={14} />
                    <select
                      value={activeGroupId}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="bg-transparent px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none dark:text-slate-200 cursor-pointer"
                    >
                      {myGroups.map(g => (
                        <option key={g._id} value={g._id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    ⚠️ No Groups Joined
                  </div>
                )}

                {/* Audit Verification Modal Trigger */}
                <button
                  onClick={() => setShowAuditModal(true)}
                  className="flex items-center gap-1.5 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60"
                >
                  <FiShield size={14} /> Audit Proof
                </button>

                {/* Theme Toggle */}
                <button
                  className="rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
                </button>
              </div>
            </div>
          </header>

          <Outlet />
        </main>
      </div>

      {/* Audit Ledger Verification Modal */}
      {showAuditModal && <AuditLedgerModal onClose={() => setShowAuditModal(false)} />}
    </div>
  );
}

export default Layout;
