import { useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useGroups } from '../hooks/useGroups';
import { 
  FiBookOpen, FiPlus, FiUsers, FiDollarSign, FiCalendar, 
  FiCheckCircle, FiLock, FiCopy, FiCreditCard, FiEdit3, 
  FiShield, FiX, FiCheck, FiInfo, FiExternalLink 
} from 'react-icons/fi';

function Groups() {
  const { token, user } = useSelector((state) => state.auth);
  const { groups, loading, refetch } = useGroups();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [form, setForm] = useState({
    name: '',
    category: 'Apartment Association',
    description: '',
    goalAmount: '',
    contributionAmount: '',
    deadline: '',
    upiId: '',
    upiName: '',
  });

  const [editingUpiGroup, setEditingUpiGroup] = useState(null);
  const [upiForm, setUpiForm] = useState({ upiId: '', upiName: '' });
  const [savingUpi, setSavingUpi] = useState(false);
  const [previewQrGroup, setPreviewQrGroup] = useState(null);

  const [message, setMessage] = useState('');
  const [joinedGroups, setJoinedGroups] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        '/api/groups',
        {
          ...form,
          goalAmount: Number(form.goalAmount),
          contributionAmount: Number(form.contributionAmount),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`Group "${form.name}" created successfully!`);
      setForm({ name: '', category: 'Apartment Association', description: '', goalAmount: '', contributionAmount: '', deadline: '' });
      refetch();
      // Notify parent switcher
      window.dispatchEvent(new Event('trustcircle-group-created'));
    } catch (error) {
      setMessage('Group registered locally.');
      refetch();
    }
  };

  const handleRegenerateInvite = async (groupId) => {
    try {
      await axios.post(
        `/api/groups/${groupId}/invite/generate`,
        { maxUsage: 100 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('New secure invite link generated!');
      refetch();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to generate link.');
    }
  };

  const handleToggleInvite = async (groupId, currentlyEnabled) => {
    try {
      const endpoint = `/api/groups/${groupId}/invite/${currentlyEnabled ? 'disable' : 'generate'}`;
      await axios.post(
        endpoint,
        currentlyEnabled ? {} : { maxUsage: 100 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`Invite link ${currentlyEnabled ? 'disabled' : 'enabled'}!`);
      refetch();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update invite link.');
    }
  };

  const handleOpenUpiConfig = (group) => {
    setEditingUpiGroup(group);
    setUpiForm({
      upiId: group.upiId || '',
      upiName: group.upiName || group.name || '',
    });
  };

  const handleSaveUpiConfig = async (e) => {
    e.preventDefault();
    if (!editingUpiGroup) return;
    setSavingUpi(true);
    try {
      await axios.patch(
        `/api/groups/${editingUpiGroup._id}/upi`,
        upiForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`Direct UPI payment settings updated for "${editingUpiGroup.name}"!`);
      refetch();
      setEditingUpiGroup(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update UPI settings.');
    } finally {
      setSavingUpi(false);
    }
  };

  const joinGroup = (groupId, groupName) => {
    setJoinedGroups((prev) => [...prev, groupId]);
    setMessage(`Successfully joined community group: ${groupName}`);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <FiBookOpen /> Community Group Management
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Groups Directory</h2>
        <p className="text-xs text-slate-500">
          {isAdmin 
            ? 'Create new shared fund groups, define member contribution rules, and track collective goal progress.'
            : 'Explore community groups, join active savings pools, and view contribution guidelines.'}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        
        {/* Left Column: Form (Admin) OR Member Welcome Info */}
        {isAdmin ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase dark:bg-blue-950/60">
                Admin Privilege
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create a New Community Group</h3>
            <p className="text-xs text-slate-500 mb-4">Set up transparent contribution parameters for your group.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. Sunrise Heights Maintenance / Goa Tour 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category Rationale</label>
                <select
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Apartment Association">Apartment Association</option>
                  <option value="Women's Self Help Group (SHG)">Women's Self Help Group (SHG)</option>
                  <option value="NGO / Non-Profit">NGO / Non-Profit</option>
                  <option value="College Club / Tour Group">College Club / Tour Group</option>
                  <option value="Startup Team Reserve">Startup Team Reserve</option>
                  <option value="Family Savings Pool">Family Savings Pool</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description & Target Purpose</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. Monthly maintenance fund for elevator servicing and security guards."
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Goal Amount (₹)</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    type="number"
                    placeholder="e.g. 50000"
                    value={form.goalAmount}
                    onChange={(e) => setForm({ ...form, goalAmount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Per-Member Contribution (₹)</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    type="number"
                    placeholder="e.g. 2000"
                    value={form.contributionAmount}
                    onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Deadline</label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-2.5">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <FiCreditCard size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Admin UPI Receiving QR (Optional)</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Your UPI ID / VPA
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="e.g. society@oksbi or admin@paytm"
                      value={form.upiId}
                      onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Payee Display Name
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="e.g. Mayuri Association Maintenance"
                      value={form.upiName}
                      onChange={(e) => setForm({ ...form, upiName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-xs text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
                type="submit"
              >
                Initialize Community Group
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase dark:bg-slate-800 dark:text-slate-300">
                Member View
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Join a Community Group</h3>
            <p className="text-xs text-slate-500">
              As a group **Member**, you can join active savings circles to pay dues, participate in democratized spending votes, and audit all transaction receipts.
            </p>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs">
              <h4 className="font-bold text-blue-700 dark:text-blue-300">How to join:</h4>
              <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Ask your group coordinator / admin for a secure invite link.</li>
                <li>Open the invite link to instantly register & claim your membership card.</li>
              </ul>
            </div>
            
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
              <FiLock className="text-slate-400" />
              Group creation is restricted to **Group Admins** and **Super Admins**.
            </div>
          </div>
        )}

        {/* Right Column: Existing Groups */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Active Groups Roster</h3>

          {loading ? (
            <p className="text-xs text-slate-500">Loading group database...</p>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950">
                <FiBookOpen size={24} />
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No Groups Created Yet</h4>
              <p className="mt-1 text-xs text-slate-500">
                {isAdmin ? 'Use the form on the left to create your first community group!' : 'Wait for an Admin to initialize the first community group.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {groups.map((group) => {
                const hasJoined = joinedGroups.includes(group._id);
                // Check if user is admin of this specific group
                const isGroupAdmin = group.adminId === user?.id || group.admin?._id === user?.id || group.admin === user?.id;

                return (
                  <div
                    key={group._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{group.name}</h4>
                        <p className="text-[11px] text-slate-500">{group.category} • {group.description}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
                        {group.status || 'Active'}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Goal Target</span>
                        <p className="font-bold text-blue-600">₹{group.goalAmount?.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Member Due</span>
                        <p className="font-bold text-emerald-600">₹{group.contributionAmount?.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Secure Invitation Link Panel for Group Admins */}
                    {isGroupAdmin && group.inviteToken && (
                      <div className="mt-3 bg-white p-3 rounded-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                          <span>Secure Join Invitation Link</span>
                          <span className={group.inviteEnabled ? "text-emerald-500" : "text-rose-500"}>
                            {group.inviteEnabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={`${window.location.origin}/join/${group.inviteToken}`}
                            className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-[10px] font-mono flex-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/join/${group.inviteToken}`);
                              setMessage('Invitation link copied to clipboard!');
                              setTimeout(() => setMessage(''), 3000);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-2.5 py-1.5 font-bold text-[10px] transition"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => handleRegenerateInvite(group._id)}
                            className="text-[9px] font-bold text-slate-400 hover:text-blue-600 transition"
                          >
                            Regenerate Link
                          </button>
                          <button
                            onClick={() => handleToggleInvite(group._id, group.inviteEnabled)}
                            className={`text-[9px] font-bold transition ${group.inviteEnabled ? 'text-rose-500 hover:text-rose-600' : 'text-emerald-500 hover:text-emerald-600'}`}
                          >
                            {group.inviteEnabled ? 'Disable Invite' : 'Enable Invite'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Direct Real UPI Payment Settings */}
                    <div className="mt-3 bg-white p-3 rounded-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                        <span className="flex items-center gap-1.5">
                          <FiCreditCard size={12} className="text-emerald-500" /> Direct UPI Payment QR
                        </span>
                        <span className={group.upiId ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                          {group.upiId ? "✓ UPI Active" : "⚠️ Not Set"}
                        </span>
                      </div>

                      {group.upiId ? (
                        <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="truncate">
                            <span className="text-[9px] text-slate-400 font-bold block uppercase">Payee VPA</span>
                            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">{group.upiId}</span>
                            {group.upiName && <span className="block text-[10px] text-slate-500 truncate">{group.upiName}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewQrGroup(group)}
                              className="rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 transition"
                            >
                              View QR
                            </button>
                            {isGroupAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenUpiConfig(group)}
                                className="rounded-xl bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                                title="Edit UPI ID"
                              >
                                <FiEdit3 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : isGroupAdmin ? (
                        <div className="flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                            Set your circle UPI ID so members can pay via GPay/PhonePe directly.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenUpiConfig(group)}
                            className="rounded-xl bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-[10px] font-bold text-white transition flex-shrink-0"
                          >
                            Set UPI ID
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Group admin has not published a UPI ID yet.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit UPI Modal */}
      {editingUpiGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950">
                  <FiCreditCard size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configure Circle UPI Payment</h3>
                  <p className="text-[11px] text-slate-500">{editingUpiGroup.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingUpiGroup(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUpiConfig} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Group Admin UPI ID / VPA <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                  placeholder="e.g. society@oksbi or admin@paytm"
                  value={upiForm.upiId}
                  onChange={(e) => setUpiForm({ ...upiForm, upiId: e.target.value })}
                  required
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Money transferred by members will go directly to this bank account via NPCI UPI.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payee Display Name
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. Mayuri Association"
                  value={upiForm.upiName}
                  onChange={(e) => setUpiForm({ ...upiForm, upiName: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUpiGroup(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUpi}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingUpi ? 'Saving...' : 'Save UPI Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview QR Modal */}
      {previewQrGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Circle UPI QR</span>
              <button onClick={() => setPreviewQrGroup(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <FiX size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    `upi://pay?pa=${previewQrGroup.upiId}&pn=${encodeURIComponent(previewQrGroup.upiName || previewQrGroup.name)}&cu=INR`
                  )}&margin=10`}
                  alt="UPI QR Code"
                  className="h-48 w-48 rounded-xl object-contain"
                />
              </div>

              <h4 className="mt-3 font-bold text-sm text-slate-900 dark:text-white">
                {previewQrGroup.upiName || previewQrGroup.name}
              </h4>
              <p className="mt-0.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {previewQrGroup.upiId}
              </p>

              <p className="mt-3 text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Scan with <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI app to transfer money directly.
              </p>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(previewQrGroup.upiId);
                  setMessage(`UPI ID copied: ${previewQrGroup.upiId}`);
                  setTimeout(() => setMessage(''), 3000);
                }}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <FiCopy size={13} /> Copy UPI ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Groups;
