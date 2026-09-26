import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiSend, FiPaperclip, FiInfo, FiTrendingUp, FiLock, FiCheckCircle } from 'react-icons/fi';
import io from 'socket.io-client';

// Initialize socket outside component to avoid multiple connection issues
let socket;

function Chat() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Group Members
  const fetchGroupMembers = async () => {
    if (!token || !activeGroupId) return;
    setLoadingMembers(true);
    try {
      const response = await axios.get('/api/groups', { headers: { Authorization: `Bearer ${token}` } });
      const currentGroup = response.data.find(g => g._id === activeGroupId);
      if (currentGroup) {
        // Fallback checks for members schema
        const membersList = currentGroup.members || [];
        setGroupMembers(membersList);
      }
    } catch (error) {
      console.error('Failed to load group members roster:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Setup sockets and fetch history
  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);

    if (!token || !activeGroupId) {
      setLoadingMembers(false);
      return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
    }

    fetchGroupMembers();

    // Fetch Chat History
    const fetchChatMessages = async () => {
      try {
        const response = await axios.get(`/api/chat/messages?groupId=${activeGroupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch chat logs:', error);
      }
    };
    fetchChatMessages();

    // Socket Connection
    socket = io(window.location.origin);
    socket.emit('join_group', activeGroupId);

    socket.on('receive_message', (msg) => {
      if (msg.groupId === activeGroupId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
      if (socket) {
        socket.off('receive_message');
        socket.disconnect();
      }
    };
  }, [token, activeGroupId]);

  const sendMessage = async () => {
    if (!draft.trim()) return;

    const tempId = `msg_${Date.now()}`;
    const payload = {
      id: tempId,
      sender: user?.name || 'Community Member',
      text: draft,
      groupId: activeGroupId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: user?.role || 'Member',
      avatar: user?.role === 'admin' || user?.role === 'superadmin' ? '👩‍💼' : '👤',
    };

    // Emit live to socket room
    if (socket) {
      socket.emit('send_message', payload);
    }

    setDraft('');

    try {
      await axios.post(
        '/api/chat/messages',
        { text: payload.text, groupId: activeGroupId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to save chat message in db:', error);
    }
  };

  const renderMessageContent = (text) => {
    if (text.startsWith('[PROPOSAL_CARD]')) {
      const parts = text.split(' : ');
      const proposalId = parts[1] || '';
      const title = parts[2] || 'Budget Proposal';
      const amount = parts[3] || '₹0';
      const desc = parts[4] || '';

      return (
        <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30 text-xs max-w-sm space-y-2">
          <div className="flex items-center justify-between font-bold text-blue-800 dark:text-blue-300">
            <span>🗳️ Active Vote Proposal</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">Voting Open</span>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h4>
          <p className="font-semibold text-blue-600 dark:text-blue-400">Required: {amount}</p>
          <p className="text-[11px] text-slate-500 leading-normal">{desc}</p>
          <button
            onClick={() => navigate('/dashboard/voting')}
            className="w-full mt-2 rounded-xl bg-blue-600 px-3 py-2 text-center font-bold text-[10px] text-white hover:bg-blue-700 shadow transition"
          >
            Open Voting Ballot & Cast Vote
          </button>
        </div>
      );
    }
    return <p className="text-xs text-slate-700 dark:text-slate-300 font-medium pl-7 leading-relaxed">{text}</p>;
  };

  if (!activeGroupId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
          <FiInfo size={28} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Active Group Required</h3>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
          Please select or join a community group to access the group chat workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <FiMessageSquare /> Realtime Socket.IO Workspace Chat
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Community Group Chat</h2>
        <p className="text-xs text-slate-500">
          Coordinate proposals, share payment confirmation slips, and communicate with group members in real time.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Members Roster Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Group Members</h3>
          {loadingMembers ? (
            <p className="text-xs text-slate-400">Loading roster...</p>
          ) : groupMembers.length === 0 ? (
            <p className="text-xs text-slate-400">No members in directory.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {groupMembers.map((person) => (
                <div
                  key={person._id || person.email}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👤</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{person.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{person.role || 'Member'}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Stream Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between h-[500px]">
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{msg.avatar || '👤'}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{msg.sender}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300 capitalize">
                        {msg.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>
                  {renderMessageContent(msg.text)}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button className="rounded-xl border border-slate-200 p-2.5 text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
              <FiPaperclip size={16} />
            </button>
            <input
              className="flex-1 rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a group message or discuss budgets..."
            />
            <button
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-xs text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
              onClick={sendMessage}
            >
              <FiSend /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
