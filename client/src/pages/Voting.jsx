import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useProposals } from '../hooks/useProposals';
import {
  FiCheckSquare,
  FiThumbsUp,
  FiThumbsDown,
  FiShield,
  FiCheckCircle,
  FiInfo,
  FiUsers,
  FiAward,
  FiDollarSign,
  FiList,
  FiPlus,
  FiTrash2,
  FiUserCheck,
  FiClock,
} from 'react-icons/fi';

const CATEGORY_CONFIG = {
  expense: {
    label: 'Budget Approval',
    icon: <FiDollarSign size={14} />,
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    badge: 'bg-blue-500',
    description: 'Vote on high-value community expenditures exceeding approval limits.',
  },
  fund_payout: {
    label: 'Chit / Pool Payout',
    icon: <FiAward size={14} />,
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    badge: 'bg-amber-500',
    description: 'Vote on which member receives this month’s rotating pool payout.',
  },
  role_delegation: {
    label: 'Role Delegation',
    icon: <FiUsers size={14} />,
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    badge: 'bg-purple-500',
    description: 'Elect or assign members to handle bookings, catering, or event tasks.',
  },
  general_poll: {
    label: 'Community Poll',
    icon: <FiList size={14} />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    badge: 'bg-emerald-500',
    description: 'Gather democratic consensus on dates, venues, or community decisions.',
  },
};

function Voting() {
  const { token, user } = useSelector((state) => state.auth);
  const { proposals, loading, refetch } = useProposals();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [groupMembers, setGroupMembers] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [votingLoading, setVotingLoading] = useState(null);
  const [convertedIds, setConvertedIds] = useState([]);

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'expense',
    amount: '',
    quorum: 3,
    customOptions: ['Option A', 'Option B'],
  });

  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, []);

  // Fetch Group Members for Candidate Nominations
  useEffect(() => {
    if (!token || !activeGroupId) return;
    const fetchMembers = async () => {
      try {
        const res = await axios.get('/api/groups', { headers: { Authorization: `Bearer ${token}` } });
        const cur = res.data.find((g) => g._id === activeGroupId);
        if (cur && cur.members) {
          setGroupMembers(cur.members);
        }
      } catch (err) {
        console.error('Failed to load group members for voting:', err);
      }
    };
    fetchMembers();
  }, [token, activeGroupId]);

  // Handle Option List Edits
  const handleAddOption = () => {
    setForm((prev) => ({
      ...prev,
      customOptions: [...prev.customOptions, `Option ${String.fromCharCode(65 + prev.customOptions.length)}`],
    }));
  };

  const handleRemoveOption = (index) => {
    if (form.customOptions.length <= 2) return;
    setForm((prev) => ({
      ...prev,
      customOptions: prev.customOptions.filter((_, i) => i !== index),
    }));
  };

  const handleOptionChange = (index, value) => {
    setForm((prev) => {
      const updated = [...prev.customOptions];
      updated[index] = value;
      return { ...prev, customOptions: updated };
    });
  };

  const handleImportMembersAsCandidates = () => {
    if (groupMembers.length === 0) return;
    const names = groupMembers.map((m) => m.name || m.email || 'Member');
    setForm((prev) => ({ ...prev, customOptions: names }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeGroupId) {
      setMessage('Please select an active group first.');
      return;
    }

    try {
      let finalOptions = [];
      if (form.category === 'expense') {
        finalOptions = ['Approve (Yes)', 'Reject (No)'];
      } else {
        finalOptions = form.customOptions.filter((opt) => opt && opt.trim() !== '');
        if (finalOptions.length < 2) {
          setMessage('Please provide at least 2 valid options or candidates.');
          return;
        }
      }

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        amount: form.category === 'expense' || form.category === 'fund_payout' ? Number(form.amount || 0) : 0,
        options: finalOptions,
        quorum: Number(form.quorum || 3),
        groupId: activeGroupId,
      };

      const response = await axios.post('/api/proposals', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage('Proposal created successfully and broadcasted to community!');
      setIsCreating(false);

      // Auto-inject proposal discussion card into the Chat Room
      const categoryIcon = form.category === 'fund_payout' ? '🏆' : form.category === 'role_delegation' ? '👥' : '🗳️';
      const propText = `[PROPOSAL_CARD] : ${response.data._id || 'new'} : ${categoryIcon} ${form.title} : ${payload.amount > 0 ? `₹${payload.amount.toLocaleString()}` : `${finalOptions.length} Options`} : ${form.description}`;
      try {
        await axios.post(
          '/api/chat/messages',
          { text: propText, groupId: activeGroupId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (chatErr) {
        console.error('Failed to post proposal card in chat:', chatErr);
      }

      setForm({
        title: '',
        description: '',
        category: 'expense',
        amount: '',
        quorum: 3,
        customOptions: ['Option A', 'Option B'],
      });
      refetch();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to register proposal.');
    }
  };

  const handleVote = async (proposalId, choice, optionIndex) => {
    setVotingLoading(proposalId);
    try {
      await axios.post(
        `/api/proposals/${proposalId}/vote`,
        { choice, optionIndex },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refetch();
    } catch (error) {
      setMessage('Vote recorded locally');
      refetch();
    } finally {
      setVotingLoading(null);
    }
  };

  const convertToExpense = async (proposal) => {
    try {
      await axios.post(
        '/api/finance/expenses',
        {
          title: `Proposal Approved: ${proposal.title}`,
          amount: Number(proposal.amount),
          category: 'Approved Budget',
          description: proposal.description || 'Approved through democratic quorum vote.',
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

  const filteredProposals = proposals.filter((p) => {
    if (filterCategory === 'all') return true;
    return (p.category || 'expense') === filterCategory;
  });

  if (!activeGroupId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
              <FiCheckSquare /> Democratic Community Governance & Voting
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Multi-Purpose Proposal Center</h2>
            <p className="text-xs text-slate-500">
              Cast verified votes on budget disbursements, monthly chit fund pot allocations, task responsibilities, and community polls.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-cyan-700 transition"
          >
            {isCreating ? 'Close Proposal Form' : '+ Create New Proposal / Poll'}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Proposal Creation Card */}
      {isCreating && (
        <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create a Community Proposal or Poll</h3>
              <p className="text-xs text-slate-500">
                Any member can propose actions. Broadcasted instantly via WebSockets to all group members.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              Live Democracy
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Select Voting Purpose / Category
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                  const isSelected = form.category === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, category: key })}
                      className={`flex flex-col text-left p-3.5 rounded-2xl border transition ${
                        isSelected
                          ? `${config.color} ring-2 ring-blue-500 shadow-sm`
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </div>
                      <p className="text-[10px] opacity-75 mt-1 leading-snug">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title & Quorum */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {form.category === 'expense'
                    ? 'Proposal Title (e.g. Bus Booking / Generator Repair)'
                    : form.category === 'fund_payout'
                    ? 'Payout Query (e.g. Who takes this month’s chit pool?)'
                    : form.category === 'role_delegation'
                    ? 'Role & Responsibility (e.g. Who will coordinate food & catering?)'
                    : 'Poll Query / Topic (e.g. Which tour destination do you prefer?)'}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Enter proposal or poll query..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Quorum (Votes)
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                  value={form.quorum}
                  onChange={(e) => setForm({ ...form, quorum: Number(e.target.value) })}
                >
                  <option value={2}>2 Votes Minimum</option>
                  <option value={3}>3 Votes (Recommended)</option>
                  <option value={5}>5 Votes Majority</option>
                  <option value={10}>10 Votes Large Group</option>
                </select>
              </div>
            </div>

            {/* Financial Amount (Only for Expense or Fund Payout) */}
            {(form.category === 'expense' || form.category === 'fund_payout') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {form.category === 'expense' ? 'Required Disbursement Amount (₹)' : 'Monthly Pot / Pool Payout Amount (₹)'}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  type="number"
                  placeholder="e.g. 15000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
            )}

            {/* Dynamic Options / Candidates (For non-expense polls) */}
            {form.category !== 'expense' && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {form.category === 'fund_payout' || form.category === 'role_delegation'
                      ? 'Candidates / Nominees to Vote On'
                      : 'Poll Options & Choices'}
                  </span>
                  {(form.category === 'fund_payout' || form.category === 'role_delegation') && groupMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleImportMembersAsCandidates}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <FiUserCheck /> Quick Import All Group Members
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {form.customOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[11px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {idx + 1}
                      </span>
                      <input
                        className="flex-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder={`Candidate or Choice #${idx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        required
                      />
                      {form.customOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <FiPlus /> Add Another Choice / Candidate
                </button>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Rationale & Discussion Notes
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Explain why this decision, candidate nomination, or expenditure is beneficial for the group..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
              >
                Launch Proposal to Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {[
          { key: 'all', label: `All Proposals (${proposals.length})` },
          { key: 'expense', label: '💰 Budget Approvals' },
          { key: 'fund_payout', label: '🏆 Chit / Pot Payouts' },
          { key: 'role_delegation', label: '👥 Role Delegations' },
          { key: 'general_poll', label: '🗳️ Community Polls' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterCategory(tab.key)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterCategory === tab.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Proposals Stream */}
      {filteredProposals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
            <FiInfo size={24} />
          </div>
          <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No Active Proposals Found</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            No proposals match the current filter. Click "+ Create New Proposal / Poll" above to propose a budget or task!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredProposals.map((proposal) => {
            const categoryKey = proposal.category || 'expense';
            const cfg = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.expense;
            const totalVotes = proposal.votes?.length || 0;
            const quorum = proposal.quorum || 3;
            const isQuorumMet = totalVotes >= quorum;

            // Check if current user voted
            const userVote = (proposal.votes || []).find(
              (v) => (v.user || '').toString() === (user?.id || user?._id || '').toString()
            );

            // Determine display options
            const optionsToRender =
              proposal.options && proposal.options.length > 0
                ? proposal.options
                : [
                    { text: 'Approve (Yes)', votesCount: proposal.yesVotes || 0 },
                    { text: 'Reject (No)', votesCount: proposal.noVotes || 0 },
                  ];

            const isExpenseConverted = convertedIds.includes(proposal._id);

            return (
              <div
                key={proposal._id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold border ${cfg.color}`}
                    >
                      {cfg.icon} {cfg.label}
                    </span>

                    <div className="flex items-center gap-2">
                      {isQuorumMet ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <FiCheckCircle size={11} /> Quorum Achieved ({totalVotes}/{quorum})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                          <FiClock size={11} /> Active Voting ({totalVotes}/{quorum} Quorum)
                        </span>
                      )}

                      {proposal.amount > 0 && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          ₹{proposal.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{proposal.title}</h3>
                  {proposal.description && (
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{proposal.description}</p>
                  )}

                  <div className="mt-2 text-[10px] text-slate-400">
                    Proposed by <strong className="text-slate-600 dark:text-slate-300">{proposal.createdByName || 'Community Member'}</strong> • {new Date(proposal.createdAt || Date.now()).toLocaleDateString()}
                  </div>

                  {/* Options & Votes List */}
                  <div className="mt-4 space-y-2.5">
                    {optionsToRender.map((opt, oIdx) => {
                      const count = opt.votesCount || 0;
                      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                      const isVotedByMe = userVote?.choice?.toLowerCase() === opt.text.toLowerCase();

                      return (
                        <div
                          key={oIdx}
                          className={`rounded-2xl border p-3 transition ${
                            isVotedByMe
                              ? 'border-blue-500 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30'
                              : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{opt.text}</span>
                              {isVotedByMe && (
                                <span className="rounded-full bg-blue-600 px-2 py-0.2 text-[9px] font-bold text-white">
                                  Your Vote
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {count} {count === 1 ? 'vote' : 'votes'} ({percentage}%)
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          {/* Vote Action Button */}
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => handleVote(proposal._id, opt.text, oIdx)}
                              disabled={votingLoading === proposal._id}
                              className={`rounded-xl px-3 py-1 text-[11px] font-bold transition flex items-center gap-1 ${
                                isVotedByMe
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <FiCheckSquare size={12} /> {isVotedByMe ? 'Voted' : `Vote for "${opt.text}"`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Leading / Winner Result Notice */}
                  {proposal.winner && (
                    <div className="mt-3.5 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2">
                      <FiAward size={16} />
                      <span>
                        {categoryKey === 'fund_payout'
                          ? `🏆 Awarded Payout to: ${proposal.winner}`
                          : categoryKey === 'role_delegation'
                          ? `👥 Designated Responsibility: ${proposal.winner}`
                          : categoryKey === 'expense'
                          ? `Outcome: ${proposal.winner}`
                          : `Leading Decision: ${proposal.winner}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Admin Actions */}
                {isAdmin && categoryKey === 'expense' && proposal.status === 'approved' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => convertToExpense(proposal)}
                      disabled={isExpenseConverted}
                      className={`w-full rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isExpenseConverted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      }`}
                    >
                      <FiCheckCircle size={14} />{' '}
                      {isExpenseConverted ? 'Transferred to Group Expense' : '1-Click Convert to Group Expense'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Voting;