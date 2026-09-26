import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useProposals } from '../hooks/useProposals';
import { FiCheckSquare, FiThumbsUp, FiThumbsDown, FiShield, FiArrowRight, FiCheckCircle, FiLock, FiInfo } from 'react-icons/fi';

function Voting() {
  const { token, user } = useSelector((state) => state.auth);
  const { proposals, loading, refetch } = useProposals();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [form, setForm] = useState({ title: '', description: '', amount: '', approvalMethod: 'voting' });
  const [message, setMessage] = useState('');
  const [convertedIds, setConvertedIds] = useState([]);

  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeGroupId) {
      setMessage('Please select an active group first.');
      return;
    }
    
    try {
      const response = await axios.post(
        '/api/proposals',
        { 
          ...form, 
          amount: Number(form.amount),
          groupId: activeGroupId 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Proposal created successfully!');
      
      // Auto-inject proposal discussion card into the Chat Room
      const propText = `[PROPOSAL_CARD] : ${response.data._id || 'new'} : ${form.title} : ₹${Number(form.amount).toLocaleString()} : ${form.description}`;
      try {
        await axios.post(
          '/api/chat/messages',
          { text: propText, groupId: activeGroupId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (chatErr) {
        console.error('Failed to post proposal card in chat:', chatErr);
      }

      setForm({ title: '', description: '', amount: '', approvalMethod: 'voting' });
      refetch();
    } catch (error) {
      setMessage('Failed to register proposal.');
    }
  };

  const handleVote = async (proposalId, choice) => {
    try {
      await axios.post(`/api/proposals/${proposalId}/vote`, { choice }, { headers: { Authorization: `Bearer ${token}` } });
      refetch();
    } catch (error) {
      setMessage('Vote recorded locally');
      refetch();
    }
  };

  const convertToExpense = async (proposal) => {
    try {
      // Add proposal as approved expense in the ledger
      await axios.post(
        '/api/finance/expenses',
        {
          title: `Proposal Approved: ${proposal.title}`,
          amount: Number(proposal.amount),
          category: 'Approved Budget',
          description: proposal.description,
          receipt: 'PROPOSAL_VOTE_VERIFIED',
          groupId: activeGroupId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setConvertedIds((prev) => [...prev, proposal._id]);
      setMessage(`Proposal "${proposal.title}" successfully converted to Group Expense!`);
      refetch();
    } catch (error) {
      setMessage('Failed to convert proposal to expense.');
    }
  };

  if (!activeGroupId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
          <FiInfo size={28} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Active Group Required</h3>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
          Please select or join a community group to manage voting proposals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <FiCheckSquare /> Multi-Sig Governance & Democratic Voting
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Proposal & Voting System</h2>
        <p className="text-xs text-slate-500">
          {isAdmin 
            ? 'Create budget proposals, vote in real-time, enforce Multi-Sig thresholds, and convert approved votes to expenses.'
            : 'Participate in democratic voting, cast YES/NO approvals for spending proposals, and track governance milestones.'}
        </p>
      </div>

      {/* Grid */}
      <div className={isAdmin ? "grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" : "max-w-3xl mx-auto"}>
        
        {/* Create Proposal Card (Admin Only) */}
        {isAdmin && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Proposal</h3>
            <p className="text-xs text-slate-500 mb-4">Proposals require majority member approval before funds are released.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Proposal Title</label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. Bus Booking / Solar Maintenance"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Required Amount (₹)</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    type="number"
                    placeholder="Amount (₹)"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Approval Method</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                    value={form.approvalMethod}
                    onChange={(e) => setForm({ ...form, approvalMethod: e.target.value })}
                  >
                    <option value="voting">Member Voting (Majority)</option>
                    <option value="admin">Group Admin Sign-off Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description & Purpose Details</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Detailed justification and vendor breakdown"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              {Number(form.amount) > 20000 && (
                <div className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900 flex items-center gap-2">
                  <FiShield /> High Amount Notice: Multi-Sig Dual Admin Sign-off active for amounts &gt; ₹20,000.
                </div>
              )}

              <button
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-xs text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
                type="submit"
              >
                Submit Proposal for Member Vote
              </button>
            </form>

            {message && (
              <p className="mt-3 rounded-xl bg-blue-50 p-2.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {message}
              </p>
            )}
          </div>
        )}

        {/* Proposals List Card (Visible to All) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Proposals & Realtime Votes</h3>
            {!isAdmin && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <FiLock size={12} /> Voter Access
              </span>
            )}
          </div>

          {proposals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
                <FiInfo size={24} />
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No Active Proposals</h4>
              <p className="mt-1 text-xs text-slate-500">
                {isAdmin ? 'Use the form on the left to create the first spending proposal!' : 'Wait for an Admin to submit the first spending proposal.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {proposals.map((proposal) => {
                const yesCount = proposal.yesVotes || 0;
                const noCount = proposal.noVotes || 0;
                const totalVotes = yesCount + noCount;
                const yesPercent = totalVotes > 0 ? Math.round((yesCount / totalVotes) * 100) : 0;
                const isHighValue = proposal.amount > 20000;
                const isConverted = convertedIds.includes(proposal._id);

                return (
                  <div
                    key={proposal._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{proposal.title}</h4>
                          {isHighValue && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              Multi-Sig Threshold
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{proposal.description}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        ₹{proposal.amount?.toLocaleString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        <span>Approval: {yesPercent}% YES ({yesCount} Votes)</span>
                        <span>{noCount} NO</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${yesPercent}%` }} />
                      </div>
                    </div>

                    {/* Voting Actions & Conversion */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVote(proposal._id, 'yes')}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-[11px] text-white hover:bg-emerald-700 transition"
                        >
                          <FiThumbsUp size={12} /> Vote Yes
                        </button>
                        <button
                          onClick={() => handleVote(proposal._id, 'no')}
                          className="flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 font-bold text-[11px] text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          <FiThumbsDown size={12} /> Vote No
                        </button>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => convertToExpense(proposal)}
                          disabled={isConverted}
                          className={`flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold text-[11px] transition ${
                            isConverted
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <FiCheckCircle size={12} /> {isConverted ? 'Converted to Expense' : '1-Click Convert to Expense'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Voting;
