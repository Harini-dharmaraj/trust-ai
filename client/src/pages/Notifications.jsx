import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  FiBell, FiCheckCircle, FiDollarSign, FiCheckSquare, 
  FiShield, FiRefreshCw, FiTrendingDown, FiAward, 
  FiLayers, FiFilter, FiCheck, FiInfo, FiMessageSquare,
  FiArrowRight
} from 'react-icons/fi';
import { useGroups } from '../hooks/useGroups';

function Notifications() {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const { groups } = useGroups();
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [filter, setFilter] = useState('all');
  const [groupFilterMode, setGroupFilterMode] = useState('all'); // 'all' or 'active'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, []);

  const fetchRealNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = groupFilterMode === 'active' && activeGroupId
        ? `/api/notifications?groupId=${activeGroupId}`
        : '/api/notifications';
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load real notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealNotifications();

    // Real-time socket listener for incoming notifications & chat messages
    const socket = io(window.location.origin);
    if (activeGroupId) {
      socket.emit('join_group', activeGroupId);
    }

    socket.on('new_notification', (notif) => {
      if (!activeGroupId || notif.groupId === activeGroupId || notif.groupId?.toString() === activeGroupId?.toString()) {
        setNotifications((prev) => {
          if (prev.some((n) => n._id === notif._id)) return prev;
          return [notif, ...prev];
        });
      }
    });

    socket.on('receive_message', (msg) => {
      // Live chat message fallback notification
      const chatNotif = {
        _id: `live_${msg.id || Date.now()}`,
        groupId: msg.groupId,
        title: `Chat message from ${msg.sender || 'Member'}`,
        message: msg.text || 'Sent an attachment',
        type: 'chat',
        action: 'chat_message',
        entity: msg.sender || 'Member',
        timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => {
        if (prev.some((n) => n.message === chatNotif.message && Math.abs(new Date(n.createdAt || 0) - new Date(chatNotif.createdAt)) < 3000)) {
          return prev;
        }
        return [chatNotif, ...prev];
      });
    });

    return () => {
      socket.off('new_notification');
      socket.off('receive_message');
      socket.disconnect();
    };
  }, [token, activeGroupId, groupFilterMode]);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const payload = groupFilterMode === 'active' && activeGroupId ? { groupId: activeGroupId } : {};
      await axios.patch('/api/notifications/read-all', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Helper for human-readable time
  const formatTime = (item) => {
    const raw = item.createdAt || item.timestamp;
    if (!raw) return 'Recently';
    const date = new Date(raw);
    if (isNaN(date.getTime())) return item.timestamp || 'Recently';

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  // Classify type for tab filtering
  const matchesFilter = (item) => {
    if (filter === 'all') return true;
    const type = (item.type || '').toLowerCase();
    const action = (item.action || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    if (filter === 'chat') {
      return type === 'chat' || action.includes('chat') || title.includes('message');
    }
    if (filter === 'payment') {
      return type === 'payment' || action.includes('payment') || title.includes('payment');
    }
    if (filter === 'expense') {
      return type === 'expense' || action.includes('expense') || title.includes('disbursement') || title.includes('expense');
    }
    if (filter === 'proposal') {
      return type === 'proposal' || action.includes('proposal') || title.includes('proposal');
    }
    if (filter === 'vote') {
      return type === 'vote' || action.includes('vote') || action.includes('ballot') || title.includes('ballot') || title.includes('vote');
    }
    if (filter === 'ledger') {
      return type === 'ledger' || Boolean(item.blockHash);
    }
    return type === filter;
  };

  const filtered = notifications.filter(matchesFilter);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeStyle = (item) => {
    const type = (item.type || '').toLowerCase();
    const action = (item.action || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    if (type === 'chat' || action.includes('chat') || title.includes('message')) {
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
        badge: 'bg-indigo-600 text-white',
        icon: FiMessageSquare,
        label: 'Chat'
      };
    }
    if (type === 'payment' || action.includes('payment') || title.includes('payment')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        badge: 'bg-emerald-600 text-white',
        icon: FiDollarSign,
        label: 'Payment'
      };
    }
    if (type === 'expense' || action.includes('expense') || title.includes('expense') || title.includes('disbursement')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        badge: 'bg-amber-600 text-white',
        icon: FiTrendingDown,
        label: 'Expense'
      };
    }
    if (type === 'proposal' || action.includes('proposal')) {
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        badge: 'bg-blue-600 text-white',
        icon: FiCheckSquare,
        label: 'Proposal'
      };
    }
    if (type === 'vote' || action.includes('vote') || action.includes('ballot')) {
      return {
        bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        badge: 'bg-purple-600 text-white',
        icon: FiAward,
        label: 'Vote'
      };
    }
    if (type === 'ledger' || Boolean(item.blockHash)) {
      return {
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
        badge: 'bg-cyan-600 text-white',
        icon: FiShield,
        label: 'Ledger Block'
      };
    }
    return {
      bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      badge: 'bg-slate-600 text-white',
      icon: FiBell,
      label: 'Alert'
    };
  };

  const activeGroup = groups.find(g => g._id === activeGroupId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <FiBell /> Live Real-Time Notifications
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Platform Activity Stream</h2>
          <p className="text-xs text-slate-500">
            Real activity records for member contributions, group chat messages, ledger blocks, proposals, and expenses.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Scope Selector */}
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950 text-xs font-bold">
            <button
              onClick={() => setGroupFilterMode('all')}
              className={`rounded-xl px-3 py-1.5 transition ${groupFilterMode === 'all' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}
            >
              All Circles
            </button>
            <button
              onClick={() => setGroupFilterMode('active')}
              className={`rounded-xl px-3 py-1.5 transition ${groupFilterMode === 'active' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}
            >
              {activeGroup ? activeGroup.name : 'Active Circle'}
            </button>
          </div>

          {/* Mark All As Read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
            >
              <FiCheck size={14} /> Mark all read ({unreadCount})
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchRealNotifications}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            title="Refresh notifications"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={15} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl dark:bg-slate-800/80">
        {[
          { id: 'all', label: 'All Records' },
          { id: 'chat', label: 'Chat Messages' },
          { id: 'payment', label: 'Payments' },
          { id: 'expense', label: 'Expenses' },
          { id: 'proposal', label: 'Proposals' },
          { id: 'vote', label: 'Votes' },
          { id: 'ledger', label: 'Audit Ledger' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition ${
              filter === tab.id
                ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Real Notifications List */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <FiRefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-xs font-bold text-slate-500">Loading real platform notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60">
            <FiInfo size={24} />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">No notifications recorded yet</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            {filter === 'all'
              ? 'Real notifications will appear here automatically when members pay dues, send chat messages, record expenses, submit proposals, or cast ballots.'
              : `No notifications found under the "${filter}" filter. Try selecting "All Records".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, index) => {
            const style = getTypeStyle(item);
            const Icon = style.icon;
            const isUnread = !item.read;

            return (
              <div
                key={item._id || index}
                onClick={() => isUnread && item._id && handleMarkAsRead(item._id)}
                className={`rounded-2xl border p-4.5 transition cursor-pointer shadow-sm hover:shadow-md ${
                  isUnread
                    ? 'border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/30'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${style.bg} border`}>
                      <Icon size={16} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}>
                          {style.label}
                        </span>
                        {item.blockHeight && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Block #{item.blockHeight}
                          </span>
                        )}
                        {item.amount && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {item.amount}
                          </span>
                        )}
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.message?.startsWith('[PROPOSAL_CARD]')
                          ? (() => {
                              const parts = item.message.split(' : ');
                              return `🗳️ Shared Proposal: ${parts[2] || 'Budget Proposal'} ${parts[3] ? `(${parts[3]})` : ''}`;
                            })()
                          : item.message}
                      </p>

                      {/* Cryptographic Hash Snippet for Ledger Blocks */}
                      {item.blockHash && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded-lg">
                            <FiShield size={10} /> SHA-256: {item.blockHash.substring(0, 16)}...
                          </span>
                        </div>
                      )}

                      {/* Open in Chat Action Button */}
                      {(item.type === 'chat' || style.label === 'Chat') && (
                        <div className="mt-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUnread && item._id) handleMarkAsRead(item._id);
                              navigate('/dashboard/chat');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 transition"
                          >
                            <FiMessageSquare size={12} /> Open in Chat <FiArrowRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0 text-right">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatTime(item)}
                    </span>
                    {isUnread && (
                      <span className="mt-2 h-2 w-2 rounded-full bg-blue-600" title="Unread notification" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Notifications;
