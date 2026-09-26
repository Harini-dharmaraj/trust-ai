import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { 
  FiUsers, FiAward, FiCheckCircle, FiClock, FiSearch, FiInfo, 
  FiDollarSign, FiAlertCircle, FiArrowRight 
} from 'react-icons/fi';

function Members() {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { payments } = useFinance();
  
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchGroupDetails = async () => {
    if (!token || !activeGroupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get('/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activeGroup = response.data.find(g => g._id === activeGroupId);
      if (activeGroup) {
        setCurrentGroup(activeGroup);
        setGroupMembers(activeGroup.members || []);
      }
    } catch (error) {
      console.error('Failed to load group roster members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);

    fetchGroupDetails();

    return () => {
      window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
    };
  }, [token, activeGroupId]);

  const targetDue = Number(currentGroup?.contributionAmount || 2000);

  const getMemberDues = (member) => {
    const memberPayments = (payments || []).filter((p) => {
      if (member._id && p.user && (p.user === member._id || p.user?._id === member._id || p.user === member._id.toString())) {
        return true;
      }
      if (member.name && p.memberName && p.memberName.trim().toLowerCase() === member.name.trim().toLowerCase()) {
        return true;
      }
      return false;
    });

    const totalPaid = memberPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingAmount = Math.max(0, targetDue - totalPaid);
    const percentPaid = targetDue > 0 ? Math.min(100, Math.round((totalPaid / targetDue) * 100)) : 100;
    const isFullyPaid = totalPaid >= targetDue;
    const isPartial = totalPaid > 0 && totalPaid < targetDue;
    const isUnpaid = totalPaid === 0;

    return { totalPaid, pendingAmount, percentPaid, isFullyPaid, isPartial, isUnpaid, paymentCount: memberPayments.length };
  };

  const handlePayForMember = (member, pendingAmount) => {
    navigate('/dashboard/payments', {
      state: {
        prefillMember: member.name,
        prefillAmount: pendingAmount > 0 ? String(pendingAmount) : String(targetDue),
      },
    });
  };

  const filtered = groupMembers.filter((m) => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group summary metrics
  const totalTargetPool = groupMembers.length * targetDue;
  const totalCollectedInGroup = groupMembers.reduce((acc, m) => acc + getMemberDues(m).totalPaid, 0);
  const totalPendingInGroup = Math.max(0, totalTargetPool - totalCollectedInGroup);

  if (!activeGroupId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
          <FiInfo size={28} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Active Group Required</h3>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
          Please select or join a community group to load the members directory and contribution dues status.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <FiUsers /> Member Directory & Contribution Dues Roster
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Community Member Roster</h2>
          <p className="text-xs text-slate-500">
            Target per member: <strong className="text-slate-700 dark:text-slate-200">₹{targetDue.toLocaleString()}</strong> • Track paid contributions and pending dues balances.
          </p>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search member name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Group Dues Overview Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase text-slate-400">Target Contribution Due</span>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">₹{targetDue.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ person</span></p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Group Collected</span>
          <p className="mt-1 text-xl font-bold text-emerald-600">₹{totalCollectedInGroup.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Outstanding Pending</span>
          <p className="mt-1 text-xl font-bold text-amber-600">₹{totalPendingInGroup.toLocaleString()}</p>
        </div>
      </div>

      {/* Roster Cards */}
      {loading ? (
        <p className="text-xs text-slate-500 animate-pulse">Loading members directory...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center p-8 text-xs text-slate-400">
          No matching members found in this group directory.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const trustScore = m.trustScore || 100;
            const isSelf = m._id === user?.id;
            const dues = getMemberDues(m);

            return (
              <div key={m._id || m.email} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md flex flex-col justify-between space-y-3">
                <div>
                  {/* Top Bar: Name & Role */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        {m.name}
                        {isSelf && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-600 dark:bg-blue-950">You</span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{m.email}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300 capitalize">
                      {m.role || 'Member'}
                    </span>
                  </div>

                  {/* Prominent Pending / Paid Status Mark */}
                  <div className="mt-3.5">
                    {dues.isFullyPaid ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          <FiCheckCircle size={15} /> Dues Settled
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          ✓ Fully Paid
                        </span>
                      </div>
                    ) : dues.isPartial ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800/60 dark:bg-amber-950/40 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <FiAlertCircle size={14} /> Partial Contribution
                          </span>
                          <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                            ⚠️ ₹{dues.pendingAmount.toLocaleString()} Pending
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Paid: <strong>₹{dues.totalPaid.toLocaleString()}</strong> of <strong>₹{targetDue.toLocaleString()}</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-900/60 dark:bg-rose-950/40 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                          <FiClock size={14} /> Dues Outstanding
                        </div>
                        <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-[10px] font-black text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                          ❌ ₹{targetDue.toLocaleString()} Pending
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar Towards Target Due */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Target: ₹{targetDue.toLocaleString()}</span>
                      <span className={dues.isFullyPaid ? 'text-emerald-600' : 'text-amber-600'}>
                        {dues.percentPaid}% ({dues.totalPaid.toLocaleString()} paid)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          dues.isFullyPaid
                            ? 'bg-emerald-500'
                            : dues.isPartial
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={{ width: `${dues.percentPaid}%` }}
                      />
                    </div>
                  </div>

                  {/* Trust Score & Badges */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950/60">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Trust Score</span>
                      <p className="text-base font-bold text-emerald-600">{trustScore}/100</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950/60 flex flex-col justify-center">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Tier</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {trustScore >= 95 ? '🥇 Platinum' : trustScore >= 85 ? '🥈 Gold' : '🥉 Silver'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {dues.pendingAmount > 0 ? (
                    <button
                      onClick={() => handlePayForMember(m, dues.pendingAmount)}
                      className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Pay Pending ₹{dues.pendingAmount.toLocaleString()}</span>
                      <FiArrowRight size={13} />
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold text-emerald-600">
                      <FiCheckCircle size={14} /> Target Contribution Complete
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Members;
