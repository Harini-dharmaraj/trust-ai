import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  FiArrowRight, FiBell, FiCheckCircle, FiUsers, FiZap, FiShield, FiTrendingUp, FiDollarSign, FiAward, FiInfo, FiClock 
} from 'react-icons/fi';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFinance } from '../hooks/useFinance';
import { useGroups } from '../hooks/useGroups';

function Dashboard() {
  const { token, user } = useSelector((state) => state.auth);
  const { data, loading } = useDashboardData();
  const { payments, expenses } = useFinance();
  const { groups } = useGroups();
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');

  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, []);

  // Auto-select first group if activeGroupId is empty but groups exist
  useEffect(() => {
    if (!activeGroupId && groups.length > 0) {
      const firstId = groups[0]._id;
      setActiveGroupId(firstId);
      localStorage.setItem('trustcircle-active-group', firstId);
      window.dispatchEvent(new Event('trustcircle-active-group-changed'));
    }
  }, [groups, activeGroupId]);

  const totalCollectedAmount = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalSpentAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // Compile real collection vs expense chart data dynamically
  const dynamicChartData = [
    { name: 'Total Collections', amount: totalCollectedAmount, fill: '#2563eb' },
    { name: 'Total Spent', amount: totalSpentAmount, fill: '#38bdf8' }
  ];

  const activeGroupObj = groups.find(g => g._id === activeGroupId) || (groups.length > 0 ? groups[0] : null);
  const activeGroupMembersCount = activeGroupObj?.members?.length || 1;
  const targetPerMember = Number(activeGroupObj?.contributionAmount || 2000);
  const membersList = activeGroupObj?.members || [];

  let totalPendingDuesAmount = 0;
  let membersWithPendingCount = 0;
  membersList.forEach((m) => {
    const memberName = typeof m === 'string' ? m : m.name;
    const memberId = typeof m === 'string' ? m : m._id;
    const paidByMember = payments.filter((p) => {
      if (memberId && (p.user === memberId || p.user?._id === memberId || p.user === memberId.toString())) return true;
      if (memberName && p.memberName && p.memberName.trim().toLowerCase() === memberName.trim().toLowerCase()) return true;
      return false;
    }).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pending = Math.max(0, targetPerMember - paidByMember);
    totalPendingDuesAmount += pending;
    if (pending > 0) membersWithPendingCount++;
  });

  const stats = [
    { 
      label: 'Active Roster', 
      value: activeGroupMembersCount, 
      unit: activeGroupMembersCount === 1 ? 'Member' : 'Members',
      note: 'Registered profiles', 
      icon: FiUsers,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      dotColor: 'bg-blue-500'
    },
    { 
      label: 'Total Collected', 
      value: `₹${totalCollectedAmount?.toLocaleString()}`, 
      unit: '',
      note: 'Real-time pool deposits', 
      icon: FiDollarSign,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      dotColor: 'bg-emerald-500'
    },
    { 
      label: 'Outstanding Dues', 
      value: `₹${totalPendingDuesAmount?.toLocaleString()}`, 
      unit: '',
      note: membersWithPendingCount > 0 ? `${membersWithPendingCount} members pending` : 'All dues settled', 
      icon: FiClock,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      dotColor: 'bg-amber-500'
    },
    { 
      label: 'Circle Pool Balance', 
      value: `₹${(totalCollectedAmount - totalSpentAmount).toLocaleString()}`, 
      unit: '',
      note: totalCollectedAmount - totalSpentAmount >= 0 ? 'Current available funds' : 'Treasury deficit', 
      icon: FiAward,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
      dotColor: 'bg-purple-500'
    },
  ];

  if (!activeGroupId && groups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-8 text-white shadow-xl">
          <p className="text-xs uppercase font-bold tracking-[0.2em]">TrustCircle AI Setup</p>
          <h2 className="mt-2 text-2xl font-bold">Welcome to Community Workspace</h2>
          <p className="mt-2 text-sm text-blue-100 max-w-xl">
            To start tracking collections and managing circle payouts, you need to create a community savings circle (as an Admin) or request to join an existing group (as a Member).
          </p>
        </div>

        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
            <FiInfo size={28} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Select or Create a Group</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
            You currently do not have any active community group selected. Head to the Groups page to get started.
          </p>
          <NavLink
            to="/dashboard/groups"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
          >
            Go to Groups Manager <FiArrowRight />
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-7 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur border border-white/20">
            <FiCheckCircle /> Community Savings Circle
          </div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">Transparent Savings Circle & Chit Fund</h2>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm text-blue-100 leading-relaxed">
            Track monthly member contributions, payout cycles, and shared expenses in real time.
          </p>
        </div>
      </div>

      {/* Dynamic Statistics Widgets - Clean, spacious & un-congested */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.label} 
              className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              {/* Top row: Label + Icon */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {stat.label}
                </span>
                <div className={`rounded-2xl p-2.5 ${stat.iconBg}`}>
                  <Icon size={16} />
                </div>
              </div>

              {/* Main Metric Value */}
              <div className="mt-4">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {stat.value}
                  </h3>
                  {stat.unit && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {stat.unit}
                    </span>
                  )}
                </div>

                {/* Subtitle / Status note on its own line */}
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${stat.dotColor}`} />
                  <span className="truncate">{stat.note}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart & Activity Stream */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        
        {/* Recharts dynamic summary */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Group Cash Flow Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">Aggregated contributions vs expenses in active ledger</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <FiTrendingUp /> Live Stats
              </span>
            </div>

            <div className="h-64 w-full flex items-center justify-center pt-2">
              {totalCollectedAmount === 0 && totalSpentAmount === 0 ? (
                <p className="text-xs text-slate-400 font-semibold">No transactions to graph yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} dy={6} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dx={-4} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '14px', color: '#fff', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                      formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={52}>
                      {dynamicChartData.map((entry, index) => (
                        <rect key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Activity Stream */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Audit Log</h3>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <FiBell className="animate-pulse" size={12} /> Realtime
              </div>
            </div>
            
            <div className="space-y-2.5 max-h-[230px] overflow-y-auto pr-1">
              {payments.length === 0 && expenses.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-6 text-center">No recent activities on ledger.</p>
              ) : (
                [
                  ...payments.map(p => ({ title: `${p.memberName} contributed ₹${p.amount?.toLocaleString()}`, time: 'Just now', tag: 'Payment', isPayment: true })),
                  ...expenses.map(e => ({ title: `Expense: ${e.title} (₹${e.amount?.toLocaleString()})`, time: 'Just now', tag: 'Expense', isPayment: false }))
                ].slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50/80 p-3.5 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="pr-2 truncate">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      item.isPayment 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {item.tag}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <NavLink
            to="/dashboard/payments"
            className="mt-4 flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-200 transition"
          >
            <span>Record new payment contribution</span>
            <FiArrowRight />
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
