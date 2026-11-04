import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FiMessageSquare,
  FiSend,
  FiPaperclip,
  FiInfo,
  FiCheckCircle,
  FiUsers,
  FiCheckSquare,
  FiActivity,
} from 'react-icons/fi';
import io from 'socket.io-client';

let socket;

function Chat() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [groupMembers, setGroupMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
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
      const currentGroup = response.data.find((g) => g._id === activeGroupId);
      if (currentGroup) {
        setGroupMembers(currentGroup.members || []);
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
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch chat logs:', error);
      }
    };
    fetchChatMessages();

    // Socket Connection with full user payload for Presence tracking
    socket = io(window.location.origin);
    socket.emit('join_group', {
      groupId: activeGroupId,
      userId: user?.id || user?._id,
      name: user?.name,
      role: user?.role,
    });

    socket.on('online_users_update', (onlineList) => {
      setOnlineUsers(onlineList || []);
    });

    socket.on('receive_message', (msg) => {
      if (msg.groupId === activeGroupId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    socket.on('new_proposal', () => {
      // Refresh chat or member states when new proposal is broadcasted
      fetchChatMessages();
    });

    return () => {
      window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
      if (socket) {
        socket.emit('leave_group', activeGroupId);
        socket.off('online_users_update');
        socket.off('receive_message');
        socket.off('new_proposal');
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

  // Helper to check member online status
  const isUserOnline = (member) => {
    const curId = (user?.id || user?._id || '').toString();
    const memId = (member?._id || member?.id || '').toString();
    const memName = (member?.name || '').toLowerCase();

    // Current logged-in user is always online in their own active window
    if (curId && memId && curId === memId) return true;
    if (memName && memName === (user?.name || '').toLowerCase()) return true;

    // Check active socket roster
    return onlineUsers.some(
      (u) =>
        (u.userId && u.userId.toString() === memId) ||
        (u.name && u.name.toLowerCase() === memName)
    );
  };

  const renderMessageContent = (text) => {
    if (text.startsWith('[PROPOSAL_CARD]')) {
      const parts = text.split(' : ');
      const proposalId = parts[1] || '';
      const title = parts[2] || 'Community Proposal';
      const detail = parts[3] || 'Details';
      const desc = parts[4] || '';

      return (
        <div className="mt-2 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-4 shadow-sm dark:border-blue-900/60 dark:from-blue-950/40 dark:to-indigo-950/40 text-xs max-w-sm space-y-2">
          <div className="flex items-center justify-between font-bold text-blue-800 dark:text-blue-300">
            <span className="flex items-center gap-1.5">🗳️ Community Proposal</span>
            <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
              Voting Open
            </span>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h4>
          <p className="font-semibold text-blue-600 dark:text-blue-400">{detail}</p>
          {desc && <p className="text-[11px] text-slate-500 leading-normal">{desc}</p>}
          <button
            onClick={() => navigate('/dashboard/voting')}
            className="w-full mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-center font-bold text-[11px] text-white hover:from-blue-700 hover:to-indigo-700 shadow-md transition flex items-center justify-center gap-1.5"
          >
            <FiCheckSquare size={13} /> Open Ballot & Cast Vote
          </button>
        </div>
      );
    }
    return <p className="text-xs text-slate-700 dark:text-slate-300 font-medium pl-7 leading-relaxed">{text}</p>;
  };

  if (!activeGroupId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
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

  // Count online members
  const onlineCount = groupMembers.filter((m) => isUserOnline(m)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
              <FiMessageSquare /> Realtime Socket.IO Workspace
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Community Live Chat & Collaboration</h2>
            <p className="text-xs text-slate-500">
              Coordinate proposals, debate expense approvals, share payment references, and chat with members in real time.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {onlineCount} {onlineCount === 1 ? 'Member' : 'Members'} Online Now
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Members Roster Card with Real-time Presence */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FiUsers /> Group Members Directory
              </h3>
              <p className="text-[11px] text-slate-400">Realtime presence tracking</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {groupMembers.length} Total
            </span>
          </div>

          {loadingMembers ? (
            <p className="text-xs text-slate-400">Loading roster...</p>
          ) : groupMembers.length === 0 ? (
            <p className="text-xs text-slate-400">No members registered in this circle.</p>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {/* Sort: Online members first */}
              {[...groupMembers]
                .sort((a, b) => (isUserOnline(b) ? 1 : 0) - (isUserOnline(a) ? 1 : 0))
                .map((person) => {
                  const online = isUserOnline(person);
                  const isCurrent =
                    (person._id && person._id === (user?.id || user?._id)) ||
                    person.name?.toLowerCase() === (user?.name || '').toLowerCase();

                  return (
                    <div
                      key={person._id || person.email || person.name}
                      className={`flex items-center justify-between rounded-2xl p-3 border transition ${
                        online
                          ? 'border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20'
                          : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-sm">
                            {(person.name || 'M').charAt(0).toUpperCase()}
                          </div>
                          {online ? (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                            </span>
                          ) : (
                            <span className="absolute -bottom-0.5 -right-0.5 inline-flex rounded-full h-2.5 w-2.5 bg-slate-400 border-2 border-white dark:border-slate-900"></span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{person.name || 'Member'}</span>
                            {isCurrent && (
                              <span className="rounded-md bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 capitalize">{person.role || 'Member'}</p>
                        </div>
                      </div>

                      {online ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Offline
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Message Stream Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between h-[520px]">
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                <FiMessageSquare size={32} className="text-slate-300 dark:text-slate-700" />
                <p className="font-semibold">No messages in this circle yet.</p>
                <p className="text-[11px] text-slate-400">Send a greeting or discuss community proposals below!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id || msg._id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60 shadow-sm"
                >
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
            <button
              onClick={() => navigate('/dashboard/voting')}
              title="Launch a proposal directly from chat"
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              <FiCheckSquare /> Propose Vote
            </button>
            <input
              className="flex-1 rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type message, share budget question, or coordinate..."
            />
            <button
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-bold text-xs text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition"
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