import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FiCpu, FiMessageSquare, FiDollarSign, FiUsers, FiCheckCircle, FiSend, FiInfo, FiClock, FiArrowRight } from 'react-icons/fi';
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
        content: `Hello! I am your Savings Circle AI Assistant for "${activeGroupName}". Ask me about member contributions, pool balances, who has paid, or recent circle expenses!`,
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
              <FiCpu /> Friendly Circle Finance Helper
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Savings Circle AI Assistant</h2>
            <p className="text-xs text-slate-500">
              Instant answers for member contributions, savings pool balances, and circle payouts.
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

      {/* Circle Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Circle Savings Pool Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Circle Savings Pool</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              Active Pool
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{currentBalance.toLocaleString()}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Available liquid balance
            </p>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
            Collected: ₹{totalCollected.toLocaleString()} • Spent: ₹{totalSpent.toLocaleString()}
          </p>
        </div>

        {/* Monthly Target Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Monthly Contribution Target</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              Monthly Cycle
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{requiredPerMember > 0 ? requiredPerMember.toLocaleString() : '2,000'}
              <span className="text-xs font-normal text-slate-400 ml-1">/ member</span>
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {activeGroup?.members?.length || 1} registered circle members
            </p>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
            Target pool per cycle: ₹{((requiredPerMember || 2000) * (activeGroup?.members?.length || 1)).toLocaleString()}
          </p>
        </div>

        {/* My Member Status Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">My Contribution Status</span>
            <FiCheckCircle size={18} className={userPaidTotal >= (requiredPerMember || 1) ? "text-emerald-500" : "text-amber-500"} />
          </div>
          <div className="mt-3">
            {userPaidTotal >= (requiredPerMember || 1) ? (
              <div>
                <h3 className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
                  <FiCheckCircle size={18} /> Contribution Paid
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  ₹{userPaidTotal.toLocaleString()} deposited for this circle
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-amber-600 flex items-center gap-1.5">
                  <FiClock size={18} /> Payment Pending
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  ₹{Math.max(0, (requiredPerMember || 2000) - userPaidTotal).toLocaleString()} pending for this cycle
                </p>
              </div>
            )}
          </div>
          <div className="mt-2.5 border-t border-slate-100 pt-2 dark:border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">{user?.name || 'Member'}</span>
            <Link to="/dashboard/payments" className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Payments <FiArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Suggested Queries Column */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Suggested Questions</h3>
          <p className="text-xs text-slate-500 mb-4">Click any question to ask your AI Assistant</p>

          <div className="space-y-2">
            {[
              'What is our current savings pool balance?',
              'Who hasn\'t contributed monthly dues yet?',
              'How much have I contributed so far?',
              'Show recent group expenses and payouts.',
              'How does our savings circle payout work?',
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
