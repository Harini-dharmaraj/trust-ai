import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FiCpu, FiMessageSquare, FiAward, FiAlertTriangle, FiZap, FiSend, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { useFinance } from '../hooks/useFinance';

function AIAssistant() {
  const { token, user } = useSelector((state) => state.auth);
  const { payments, expenses } = useFinance();
  
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [activeGroupName, setActiveGroupName] = useState('Community Workspace');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const handleGroupChange = () => {
      const storedId = localStorage.getItem('trustcircle-active-group') || '';
      setActiveGroupId(storedId);
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, []);

  // Fetch groups dynamically and auto-select if needed
  useEffect(() => {
    if (!token) return;

    const fetchGroups = async () => {
      try {
        const response = await axios.get('/api/groups', { headers: { Authorization: `Bearer ${token}` } });
        const list = response.data || [];
        setGroups(list);

        let currentId = activeGroupId || localStorage.getItem('trustcircle-active-group') || '';
        if (!currentId && list.length > 0) {
          currentId = list[0]._id;
          setActiveGroupId(currentId);
          localStorage.setItem('trustcircle-active-group', currentId);
          window.dispatchEvent(new Event('trustcircle-active-group-changed'));
        }

        const activeGroup = list.find((g) => g._id === currentId);
        if (activeGroup) {
          setActiveGroupName(activeGroup.name);
        }
      } catch (err) {
        console.error('Failed to load groups in AI assistant:', err);
      }
    };

    fetchGroups();
  }, [token, activeGroupId]);

  // Set initial greeting when active group changes
  useEffect(() => {
    if (!activeGroupId) return;
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I am your TrustCircle AI Assistant. I have connected to the ledger for "${activeGroupName}". Ask me about contribution statuses, group balances, spending ratios, or pending votes.`,
      },
    ]);
  }, [activeGroupId, activeGroupName]);

  const sendMessage = async (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const nextMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(nextMessages);
    if (!customText) setInput('');
    setChatLoading(true);

    try {
      const response = await axios.post(
        '/api/ai/chat',
        { message: textToSend, groupId: activeGroupId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages([...nextMessages, { role: 'assistant', content: response.data.reply }]);
    } catch (error) {
      setMessages([...nextMessages, { role: 'assistant', content: 'Database connection failed. Please check your network.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Rule-based calculations for Dynamic Trust Score & Balances
  const totalCollected = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalSpent = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const currentBalance = totalCollected - totalSpent;
  
  // Dynamic Real Trust Score based on verifiable member contributions
  const activeGroup = groups.find((g) => g._id === activeGroupId);
  const requiredPerMember = Number(activeGroup?.contributionAmount || 0);

  const currentUserId = (user?.id || user?._id || '').toString();
  const currentUserName = (user?.name || '').toLowerCase();

  const userPayments = payments.filter((p) => {
    const pUserId = (p.user?._id || p.user || '').toString();
    const pName = (p.memberName || '').toLowerCase();
    return (currentUserId && pUserId === currentUserId) || (currentUserName && pName === currentUserName);
  });

  const userPaidTotal = userPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  let calculatedTrustScore = 100;
  let trustTier = 'Verified Member';
  let trustIndicatorText = '';
  let trustScoreColor = 'border-emerald-500 text-emerald-600';

  if (requiredPerMember > 0) {
    if (userPaidTotal >= requiredPerMember) {
      calculatedTrustScore = 100;
      trustTier = 'Full Compliance';
      trustIndicatorText = `Paid ₹${userPaidTotal.toLocaleString()} of ₹${requiredPerMember.toLocaleString()} dues (100% on-time).`;
      trustScoreColor = 'border-emerald-500 text-emerald-600';
    } else if (userPaidTotal > 0) {
      calculatedTrustScore = Math.round((userPaidTotal / requiredPerMember) * 100);
      trustTier = 'Partial Contributor';
      trustIndicatorText = `Paid ₹${userPaidTotal.toLocaleString()} of ₹${requiredPerMember.toLocaleString()} (₹${(requiredPerMember - userPaidTotal).toLocaleString()} pending dues).`;
      trustScoreColor = 'border-amber-500 text-amber-600';
    } else {
      calculatedTrustScore = 0;
      trustTier = 'Contribution Pending';
      trustIndicatorText = `₹0 contributed towards ₹${requiredPerMember.toLocaleString()} dues.`;
      trustScoreColor = 'border-rose-500 text-rose-600';
    }
  } else {
    if (userPaidTotal > 0) {
      calculatedTrustScore = 100;
      trustTier = 'Active Contributor';
      trustIndicatorText = `Deposited ₹${userPaidTotal.toLocaleString()} in voluntary contributions.`;
      trustScoreColor = 'border-blue-500 text-blue-600';
    } else {
      calculatedTrustScore = 100;
      trustTier = 'Good Standing';
      trustIndicatorText = 'No scheduled dues required for this group.';
      trustScoreColor = 'border-slate-400 text-slate-500';
    }
  }

  // Real audit indicators for expenses & receipts
  const verifiedReceiptsCount = expenses.filter((e) => Boolean(e.receipt)).length;
  const duplicateReceiptsAlert = expenses.filter(
    (e, i, a) => e.receipt && a.findIndex((x) => x.receipt === e.receipt) !== i
  ).length;

  // Real reserve buffer computation
  const reserveTarget = currentBalance > 0 ? Math.round(currentBalance * 0.15) : 0;
  
  if (!activeGroupId && groups.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
          <FiInfo size={28} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Active Group Required</h3>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
          You are not currently part of any community group. Join or create a group to unlock AI insights, ledger audits, and financial advisory.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/dashboard/groups"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            Create or Join a Group
          </Link>
        </div>
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
              <FiCpu /> Dynamic AI RAG Financial Intelligence
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">AI Assistant & Governance Suite</h2>
            <p className="text-xs text-slate-500">
              Live ledger intelligence computed strictly from verified payments, audited disbursements, and active voting records.
            </p>
          </div>
          {groups.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Active Group:</span>
              <select
                value={activeGroupId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setActiveGroupId(newId);
                  localStorage.setItem('trustcircle-active-group', newId);
                  window.dispatchEvent(new Event('trustcircle-active-group-changed'));
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* AI Feature Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Personal Trust Score Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Personal Trust Score</span>
            <FiAward size={18} className={calculatedTrustScore >= 80 ? "text-emerald-500" : calculatedTrustScore > 0 ? "text-amber-500" : "text-rose-500"} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{calculatedTrustScore}/100</h3>
              <span className={`text-xs font-bold ${calculatedTrustScore >= 80 ? 'text-emerald-600' : calculatedTrustScore > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                {trustTier}
              </span>
            </div>
            <div className={`h-12 w-12 rounded-full border-4 ${trustScoreColor} flex items-center justify-center font-bold text-xs`}>
              {calculatedTrustScore}%
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 leading-normal">
            {trustIndicatorText}
          </p>
        </div>

        {/* AI Fraud Risk Scanner Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">AI Fraud Risk Scanner</span>
            <FiAlertTriangle size={18} className={duplicateReceiptsAlert > 0 ? "text-amber-500" : "text-emerald-500"} />
          </div>
          {duplicateReceiptsAlert > 0 ? (
            <div>
              <h3 className="mt-3 text-xl font-bold text-amber-600 flex items-center gap-1">
                ⚠️ Verification Alert
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Flagged {duplicateReceiptsAlert} duplicate receipt reference ID(s) across {expenses.length} expense log(s).
              </p>
            </div>
          ) : expenses.length === 0 ? (
            <div>
              <h3 className="mt-3 text-2xl font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FiCheckCircle size={20} className="text-slate-400" /> No Expenses
              </h3>
              <p className="mt-2 text-[11px] text-slate-500">
                Zero disbursements recorded in this group. Ledger has no expense records to audit.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="mt-3 text-2xl font-bold text-emerald-600 flex items-center gap-1">
                <FiCheckCircle size={20} /> Clean Ledger
              </h3>
              <p className="mt-2 text-[11px] text-slate-500">
                Audited {expenses.length} log(s) (₹{totalSpent.toLocaleString()}). {verifiedReceiptsCount} verified invoices with zero duplicate hashes detected.
              </p>
            </div>
          )}
        </div>

        {/* AI Financial Advisory Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">AI Financial Advisory</span>
            <FiZap size={18} className={currentBalance < 0 ? "text-rose-500" : "text-blue-600"} />
          </div>
          {currentBalance < 0 ? (
            <div>
              <h3 className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                ⚠️ Treasury Deficit Warning
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                Disbursements (₹{totalSpent.toLocaleString()}) exceed collections (₹{totalCollected.toLocaleString()}) by <strong className="text-rose-600 dark:text-rose-400">₹{Math.abs(currentBalance).toLocaleString()}</strong>. Immediate collection of member dues is required to resolve this deficit.
              </p>
            </div>
          ) : currentBalance === 0 ? (
            <div>
              <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                Zero Net Balance
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                Total collections match disbursements (₹{totalCollected.toLocaleString()}). The pool currently holds ₹0 liquid reserves.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Active Reserve Status
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                Available treasury balance is ₹{currentBalance.toLocaleString()} (Collected: ₹{totalCollected.toLocaleString()} | Spent: ₹{totalSpent.toLocaleString()}). Target 15% contingency reserve is ₹{reserveTarget.toLocaleString()}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Suggested Queries Column */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Suggested Prompt Queries</h3>
          <p className="text-xs text-slate-500 mb-4">Select a ledger lookup prompt to trigger AI</p>

          <div className="space-y-2">
            {[
              'How much have I paid this year?',
              'Who hasn\'t paid monthly dues yet?',
              'Show medical and emergency expenses.',
              'What is our current group balance?',
              'Explain active voting proposals.',
            ].map((promptText) => (
              <button
                key={promptText}
                onClick={() => sendMessage(promptText)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                💬 "{promptText}"
              </button>
            ))}
          </div>
        </div>

        {/* Chat Stream Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between h-[480px]">
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`rounded-2xl p-4 text-xs ${
                  msg.role === 'assistant'
                    ? 'bg-blue-50 text-slate-900 border border-blue-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                    : 'bg-blue-600 text-white ml-8 shadow-sm'
                }`}
              >
                <div className="font-bold text-[10px] uppercase opacity-75 mb-1">
                  {msg.role === 'assistant' ? '🤖 TrustCircle AI Advisor' : '👤 You'}
                </div>
                <p className="leading-relaxed font-medium">{msg.content}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="rounded-2xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800 animate-pulse">
                AI is querying ledger & financial database...
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <input
              className="flex-1 rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={`Ask advisor about ${activeGroupName} cash balances or payment history...`}
            />
            <button
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-xs text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
              onClick={() => sendMessage()}
            >
              <FiSend /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;
