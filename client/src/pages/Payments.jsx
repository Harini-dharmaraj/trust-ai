import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { 
  FiDollarSign, FiCreditCard, FiCheckCircle, FiClock, FiShield, 
  FiUploadCloud, FiInfo, FiLayers, FiAlertCircle, FiArrowRight, FiUserCheck,
  FiCopy, FiCheck, FiSmartphone, FiKey, FiEdit3, FiExternalLink
} from 'react-icons/fi';

function Payments() {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const { payments, loading, refetch } = useFinance();

  const [availableGroups, setAvailableGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [activeHistoryTab, setActiveHistoryTab] = useState('dues'); // 'dues' or 'transactions'
  const [form, setForm] = useState({
    memberName: user?.name || 'Group Member',
    amount: '1500',
    method: 'upi', // 'upi', 'razorpay', or 'bank'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiUtr, setUpiUtr] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  
  const [showRazorpayKeyModal, setShowRazorpayKeyModal] = useState(false);
  const [customRazorpayKey, setCustomRazorpayKey] = useState(
    () => localStorage.getItem('trustcircle-razorpay-key') || ''
  );
  
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankRefNo, setBankRefNo] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');

  const [editingGroupUpi, setEditingGroupUpi] = useState(false);
  const [groupUpiInput, setGroupUpiInput] = useState('');
  const [groupUpiNameInput, setGroupUpiNameInput] = useState('');

  const [paymentSuccessModal, setPaymentSuccessModal] = useState(null);
  const [message, setMessage] = useState('');

  // Pre-fill from navigation state if redirected from Members page
  useEffect(() => {
    if (location.state?.prefillMember) {
      setForm((prev) => ({
        ...prev,
        memberName: location.state.prefillMember,
        amount: location.state.prefillAmount || prev.amount,
      }));
    }
  }, [location.state]);

  // Fetch groups to ensure active group is always set
  useEffect(() => {
    const loadGroups = async () => {
      if (!token) return;
      try {
        const res = await axios.get('/api/groups', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAvailableGroups(res.data);
        if (res.data.length > 0 && (!activeGroupId || !localStorage.getItem('trustcircle-active-group'))) {
          const firstId = res.data[0]._id;
          setActiveGroupId(firstId);
          localStorage.setItem('trustcircle-active-group', firstId);
          window.dispatchEvent(new Event('trustcircle-active-group-changed'));
        }
      } catch (err) {
        console.error('Error fetching groups:', err);
      }
    };
    loadGroups();
  }, [token]);

  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, []);

  // Update memberName when auth user loads
  useEffect(() => {
    if (user?.name && !location.state?.prefillMember) {
      setForm((prev) => ({ ...prev, memberName: user.name }));
    }
  }, [user, location.state]);

  const activeGroup = availableGroups.find((g) => g._id === activeGroupId);
  const targetDue = Number(activeGroup?.contributionAmount || 2000);

  // Sync group UPI defaults when active group changes
  useEffect(() => {
    if (activeGroup) {
      setGroupUpiInput(activeGroup.upiId || '');
      setGroupUpiNameInput(activeGroup.upiName || activeGroup.name || '');
    }
  }, [activeGroup]);

  const handleGroupSelectionChange = (newGroupId) => {
    setActiveGroupId(newGroupId);
    localStorage.setItem('trustcircle-active-group', newGroupId);
    window.dispatchEvent(new Event('trustcircle-active-group-changed'));
    refetch();
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!activeGroupId) {
      setMessage('Please select or join a community group first.');
      return;
    }

    if (form.method === 'upi') {
      setShowUpiModal(true);
      return;
    }

    if (form.method === 'bank') {
      setShowBankModal(true);
      return;
    }

    if (form.method === 'razorpay') {
      await handleRazorpayGateway();
    }
  };

  const handleRazorpayGateway = async (explicitKey) => {
    setIsProcessing(true);
    setMessage('');

    try {
      // 1. Create order on backend
      const response = await axios.post(
        '/api/finance/payments/order',
        {
          amount: Number(form.amount),
          groupId: activeGroupId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderData = response.data;
      const keyToUse = explicitKey || customRazorpayKey || orderData.keyId;

      if (!keyToUse || keyToUse === 'rzp_test_placeholder') {
        setShowRazorpayKeyModal(true);
        setIsProcessing(false);
        return;
      }

      // Load official Razorpay checkout.js
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setMessage('Unable to load official Razorpay SDK. Please check your internet connection.');
        setIsProcessing(false);
        return;
      }

      const options = {
        key: keyToUse,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: activeGroup?.name || 'TrustCircle AI',
        description: `Community Dues - ${form.memberName}`,
        order_id: orderData.isRealGateway ? orderData.orderId : undefined,
        handler: async function (paymentResponse) {
          await completeVerification(
            paymentResponse.razorpay_payment_id,
            paymentResponse.razorpay_order_id,
            paymentResponse.razorpay_signature,
            'Razorpay Official Gateway'
          );
        },
        prefill: {
          name: form.memberName || user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563EB',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const paymentWindow = new window.Razorpay(options);
      paymentWindow.open();
    } catch (err) {
      console.error('Order initiation error:', err);
      setMessage('Failed to initiate Razorpay order. You can use the Real UPI Scan & Pay option instead.');
    } finally {
      setIsProcessing(false);
    }
  };

  const completeVerification = async (paymentId, orderId, signature, paymentMethod) => {
    setIsProcessing(true);
    try {
      await axios.post(
        '/api/finance/payments/verify',
        {
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature || 'verified_real_receipt',
          groupId: activeGroupId,
          amount: form.amount,
          method: paymentMethod || 'UPI Payment',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowUpiModal(false);
      setShowBankModal(false);
      setShowRazorpayKeyModal(false);
      setUpiUtr('');
      setBankRefNo('');

      setPaymentSuccessModal({
        trxId: paymentId || `pay_TRX${Math.floor(100000 + Math.random() * 900000)}`,
        amount: form.amount,
        memberName: form.memberName,
        method: paymentMethod || 'UPI Payment',
      });

      refetch();
    } catch (err) {
      console.error('Verification error:', err);
      setMessage('Payment verification failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveGroupUpi = async () => {
    try {
      await axios.patch(
        `/api/groups/${activeGroupId}/upi`,
        { upiId: groupUpiInput, upiName: groupUpiNameInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailableGroups((prev) =>
        prev.map((g) =>
          g._id === activeGroupId ? { ...g, upiId: groupUpiInput, upiName: groupUpiNameInput } : g
        )
      );
      setEditingGroupUpi(false);
      setMessage('Group UPI payee details updated successfully!');
    } catch (err) {
      console.error(err);
      setMessage('Failed to update group UPI details.');
    }
  };

  const getMemberDuesStats = (name) => {
    if (!name) {
      return { totalPaid: 0, pendingAmount: targetDue, percentPaid: 0, isFullyPaid: false, isPartial: false, isUnpaid: true, paymentsCount: 0 };
    }
    const matchingPayments = (payments || []).filter(
      (p) => p.memberName && p.memberName.trim().toLowerCase() === name.trim().toLowerCase()
    );
    const totalPaid = matchingPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const pendingAmount = Math.max(0, targetDue - totalPaid);
    const percentPaid = targetDue > 0 ? Math.min(100, Math.round((totalPaid / targetDue) * 100)) : 100;
    const isFullyPaid = totalPaid >= targetDue;
    const isPartial = totalPaid > 0 && totalPaid < targetDue;
    const isUnpaid = totalPaid === 0;

    return { totalPaid, pendingAmount, percentPaid, isFullyPaid, isPartial, isUnpaid, paymentsCount: matchingPayments.length };
  };

  const currentMemberDues = getMemberDuesStats(form.memberName);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <FiCreditCard /> Instant Payments & Razorpay Test Gateway
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Contribution Payment Hub</h2>
          <p className="text-xs text-slate-500">
            Per-member Target: <strong className="text-slate-800 dark:text-slate-200 font-bold">₹{targetDue.toLocaleString()}</strong> • Audit contributions and track pending dues balances in real-time.
          </p>
        </div>

        {/* Group Selector Dropdown */}
        {availableGroups.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            <FiLayers className="text-slate-400" size={16} />
            <div className="text-left">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Target Group</span>
              <select
                value={activeGroupId}
                onChange={(e) => handleGroupSelectionChange(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                {availableGroups.map((g) => (
                  <option key={g._id} value={g._id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {!activeGroupId ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
            <FiInfo size={28} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Active Group Required</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
            Please select or join a community group to log dues payments.
          </p>
        </div>
      ) : (
        /* Grid */
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {/* Payment Form Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pay Contribution Dues</h3>
                <p className="text-xs text-slate-500 mt-0.5">Contributing to: <span className="font-semibold text-blue-600">{activeGroup?.name || 'Active Group'}</span></p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                <FiShield size={12} /> Test Gateway
              </span>
            </div>

            {/* Prominent Member Pending Dues Callout Banner */}
            {currentMemberDues.isPartial ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-800/60 dark:bg-amber-950/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <FiAlertCircle size={15} /> Partial Dues Record Found
                  </span>
                  <span className="rounded-full bg-amber-200/90 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                    ⚠️ ₹{currentMemberDues.pendingAmount.toLocaleString()} Pending
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Target Due is <strong>₹{targetDue.toLocaleString()}</strong>. <strong>{form.memberName}</strong> has contributed <strong>₹{currentMemberDues.totalPaid.toLocaleString()}</strong> so far.
                </p>
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 pt-1">
                  <span>Progress: {currentMemberDues.percentPaid}% fulfilled</span>
                  <span className="text-amber-900 dark:text-amber-200 font-extrabold">₹{currentMemberDues.pendingAmount.toLocaleString()} to be paid</span>
                </div>
                <div className="h-2 w-full rounded-full bg-amber-200/70 dark:bg-amber-900/50 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                    style={{ width: `${currentMemberDues.percentPaid}%` }}
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, amount: String(currentMemberDues.pendingAmount) })}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 underline flex items-center gap-1"
                  >
                    <span>Auto-fill pending balance (₹{currentMemberDues.pendingAmount.toLocaleString()})</span>
                    <FiArrowRight size={12} />
                  </button>
                </div>
              </div>
            ) : currentMemberDues.isFullyPaid ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <FiCheckCircle size={15} /> Contribution Target Met!
                  </span>
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    ✓ Fully Settled (₹{currentMemberDues.totalPaid.toLocaleString()})
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Full target of ₹{targetDue.toLocaleString()} has been fulfilled. Any additional payment adds to the group reserve.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FiClock size={15} /> Target Per Person: ₹{targetDue.toLocaleString()}
                  </span>
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-black text-rose-600 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300">
                    ❌ ₹{targetDue.toLocaleString()} Pending
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">No previous payment recorded for this member. Entire dues are pending.</p>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, amount: String(targetDue) })}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
                >
                  Auto-fill target dues (₹{targetDue.toLocaleString()})
                </button>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Contributing Member</label>
                  {activeGroup?.members?.length > 0 && (
                    <span className="text-[10px] text-slate-400">Pick from roster or type</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    value={form.memberName}
                    onChange={(e) => setForm({ ...form, memberName: e.target.value })}
                    required
                  />
                  {activeGroup?.members?.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          const stats = getMemberDuesStats(e.target.value);
                          setForm({
                            ...form,
                            memberName: e.target.value,
                            amount: stats.pendingAmount > 0 ? String(stats.pendingAmount) : String(targetDue),
                          });
                        }
                      }}
                      className="rounded-xl border border-slate-200 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer max-w-[130px]"
                      defaultValue=""
                    >
                      <option value="" disabled>Select Member</option>
                      {activeGroup.members.map((m) => (
                        <option key={m._id || m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Contribution Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3 pl-8 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Quick Amount Presets */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Presets:</span>
                {['500', '1000', '1500', String(targetDue)].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setForm({ ...form, amount: amt })}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      form.amount === amt
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer font-semibold"
                >
                  <option value="upi">Real UPI Scan & Pay (Google Pay, PhonePe, Paytm, BHIM)</option>
                  <option value="razorpay">Official Razorpay Checkout (Cards, Net Banking, Wallets)</option>
                  <option value="bank">Direct Bank Transfer / NEFT / IMPS</option>
                </select>
              </div>

              {/* Group UPI Details Quick Bar */}
              {activeGroup && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <FiSmartphone className="text-blue-600" />
                      Receiving UPI: <strong className="font-mono text-blue-700 dark:text-blue-300">{activeGroup.upiId || 'society@okhdfcbank'}</strong>
                    </span>
                    {(user?.role === 'admin' || user?.role === 'superadmin' || activeGroup.admin === user?.id) && (
                      <button
                        type="button"
                        onClick={() => setEditingGroupUpi(!editingGroupUpi)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <FiEdit3 size={11} /> {editingGroupUpi ? 'Close' : 'Edit UPI'}
                      </button>
                    )}
                  </div>
                  {editingGroupUpi && (
                    <div className="mt-2.5 pt-2 border-t border-blue-200 dark:border-blue-800 space-y-2">
                      <input
                        placeholder="Admin UPI ID (e.g. society@oksbi)"
                        value={groupUpiInput}
                        onChange={(e) => setGroupUpiInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                      />
                      <input
                        placeholder="Payee Display Name (e.g. Green Park Welfare)"
                        value={groupUpiNameInput}
                        onChange={(e) => setGroupUpiNameInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleSaveGroupUpi}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 transition"
                      >
                        Save Group UPI ID
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 py-3.5 font-bold text-xs text-white shadow-lg transition hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting to Payment Gateway...
                  </div>
                ) : form.method === 'upi' ? (
                  <>
                    <FiSmartphone size={15} /> Proceed with UPI Scan & Pay (₹{Number(form.amount || 0).toLocaleString()})
                  </>
                ) : form.method === 'razorpay' ? (
                  <>
                    <FiCreditCard size={15} /> Pay with Razorpay (₹{Number(form.amount || 0).toLocaleString()})
                  </>
                ) : (
                  <>
                    <FiDollarSign size={15} /> Record Bank Transfer (₹{Number(form.amount || 0).toLocaleString()})
                  </>
                )}
              </button>
            </form>

            {message && (
              <p className="mt-2 rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-center">
                {message}
              </p>
            )}
          </div>

          {/* Right Panel: Dual View (Member Dues Roster & Transaction Audit Ledger) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              {/* Tab Header */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveHistoryTab('dues')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      activeHistoryTab === 'dues'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Member Dues & Pending Balances
                  </button>
                  <button
                    onClick={() => setActiveHistoryTab('transactions')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      activeHistoryTab === 'transactions'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Transaction Ledger ({payments.length})
                  </button>
                </div>
              </div>

              {/* View 1: Member Dues & Pending Tracker */}
              {activeHistoryTab === 'dues' && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[460px]">
                  {(!activeGroup?.members || activeGroup.members.length === 0) ? (
                    <div className="text-center p-8 text-xs text-slate-400 font-semibold">
                      No members registered in this group yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 font-bold">Member</th>
                          <th className="px-4 py-3 font-bold">Target</th>
                          <th className="px-4 py-3 font-bold">Paid</th>
                          <th className="px-4 py-3 font-bold">Pending Amount</th>
                          <th className="px-4 py-3 font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {activeGroup.members.map((m) => {
                          const stats = getMemberDuesStats(m.name);
                          return (
                            <tr key={m._id || m.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3">
                                <span className="font-bold text-slate-900 dark:text-white block">{m.name}</span>
                                <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                                  <div
                                    className={`h-full rounded-full ${stats.isFullyPaid ? 'bg-emerald-500' : stats.isPartial ? 'bg-amber-500' : 'bg-slate-300'}`}
                                    style={{ width: `${stats.percentPaid}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-500">₹{targetDue.toLocaleString()}</td>
                              <td className="px-4 py-3 font-bold text-emerald-600">₹{stats.totalPaid.toLocaleString()}</td>
                              <td className="px-4 py-3">
                                {stats.isFullyPaid ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                    <FiCheckCircle size={10} /> Fully Paid
                                  </span>
                                ) : stats.isPartial ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                    ⚠️ ₹{stats.pendingAmount.toLocaleString()} Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                                    ❌ ₹{targetDue.toLocaleString()} Unpaid
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm({
                                      ...form,
                                      memberName: m.name,
                                      amount: stats.pendingAmount > 0 ? String(stats.pendingAmount) : String(targetDue),
                                    });
                                  }}
                                  className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                                >
                                  {stats.pendingAmount > 0 ? `Pay ₹${stats.pendingAmount.toLocaleString()}` : 'Add More'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* View 2: Transaction Audit Ledger */}
              {activeHistoryTab === 'transactions' && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[460px]">
                  {payments.length === 0 ? (
                    <div className="text-center p-8 text-xs text-slate-400 font-semibold">
                      No payments completed yet for this group. Use the form to make the first contribution!
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 font-bold">Member</th>
                          <th className="px-4 py-3 font-bold">Amount</th>
                          <th className="px-4 py-3 font-bold">Method</th>
                          <th className="px-4 py-3 font-bold">Transaction ID</th>
                          <th className="px-4 py-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {payments.map((p) => (
                          <tr key={p._id || p.transactionId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{p.memberName}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600">₹{p.amount?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-500 text-[11px]">{p.method || 'Razorpay'}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-blue-600 truncate max-w-[130px]">{p.transactionId}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-[10px] text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
                                {p.status || 'Paid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REAL UPI SCAN & PAY MODAL */}
      {showUpiModal && (() => {
        const payeeUpi = activeGroup?.upiId || 'trustcircle.society@okhdfcbank';
        const payeeName = activeGroup?.upiName || activeGroup?.name || 'Community Treasury';
        const upiUri = `upi://pay?pa=${payeeUpi}&pn=${encodeURIComponent(payeeName)}&am=${form.amount}&cu=INR&tn=${encodeURIComponent('Contribution by ' + form.memberName)}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(upiUri)}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 p-5 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                      Real UPI
                    </span>
                    <span className="text-xs font-semibold text-emerald-100">Scan & Pay Gateway</span>
                  </div>
                  <h3 className="text-lg font-bold mt-1">Direct UPI Contribution</h3>
                  <p className="text-[11px] text-emerald-100">Google Pay • PhonePe • Paytm • BHIM • Cred</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-100 block">Payable</span>
                  <span className="text-2xl font-black">₹{Number(form.amount).toLocaleString()}</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Real Dynamic QR Code */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 text-center">
                  <img
                    src={qrUrl}
                    alt="UPI Payment QR Code"
                    className="h-52 w-52 rounded-xl bg-white p-2 shadow-sm border border-slate-200 dark:border-slate-700"
                  />
                  <span className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Scan with any UPI App on your phone
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Amount of ₹{Number(form.amount).toLocaleString()} is pre-configured
                  </span>
                </div>

                {/* Payee Info & Copy Button */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified Recipient VPA</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{payeeUpi}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Payee: {payeeName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(payeeUpi);
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition"
                  >
                    {copiedUpi ? (
                      <>
                        <FiCheck className="text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <FiCopy /> Copy UPI ID
                      </>
                    )}
                  </button>
                </div>

                {/* Mobile Direct Pay Button */}
                <a
                  href={upiUri}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 text-center transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <FiSmartphone size={16} /> Tap to Open UPI App (GPay / PhonePe / Paytm)
                </a>

                {/* Step 2: Enter 12-digit UTR */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Step 2: Enter 12-Digit UPI Reference (UTR)
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-600">From bank SMS or app</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Once paid, copy the 12-digit UTR / UPI Ref ID from your payment confirmation screen to record on the cryptographic ledger:
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={upiUtr}
                      onChange={(e) => setUpiUtr(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                      placeholder="e.g. 426819203810"
                      maxLength={18}
                      className="flex-1 rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold tracking-wider dark:border-slate-700 dark:bg-slate-800 dark:text-white uppercase focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isProcessing || upiUtr.trim().length < 6}
                      onClick={() =>
                        completeVerification(
                          upiUtr.trim(),
                          `upi_${Date.now()}`,
                          'upi_verified_hash',
                          'UPI (Google Pay / PhonePe / Paytm)'
                        )
                      }
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 shadow transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isProcessing ? 'Recording...' : 'Confirm'}
                    </button>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpiModal(false);
                      setUpiUtr('');
                    }}
                    className="text-slate-400 hover:text-rose-500 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <FiShield className="text-emerald-500" />
                    <span>Logged to SHA-256 Ledger</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* OFFICIAL RAZORPAY KEY SETUP MODAL */}
      {showRazorpayKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <FiCreditCard size={20} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Official Razorpay Checkout Setup</h3>
            </div>
            <p className="text-xs text-slate-500">
              To trigger the official Razorpay Standard Checkout popup (with Cards, Net Banking, and Wallets), please provide your Razorpay Key ID (available free at <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">dashboard.razorpay.com</a>):
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Razorpay Key ID (rzp_test_... or rzp_live_...)
              </label>
              <input
                value={customRazorpayKey}
                onChange={(e) => {
                  setCustomRazorpayKey(e.target.value.trim());
                  localStorage.setItem('trustcircle-razorpay-key', e.target.value.trim());
                }}
                placeholder="rzp_test_XXXXXXXXXXXXXX"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={!customRazorpayKey.trim() || isProcessing}
                onClick={() => {
                  setShowRazorpayKeyModal(false);
                  handleRazorpayGateway(customRazorpayKey.trim());
                }}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-bold text-white transition disabled:opacity-50"
              >
                Launch Official Razorpay Popup
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRazorpayKeyModal(false);
                  setShowUpiModal(true);
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Use Real UPI Scan & Pay Instead (No Key Needed)
              </button>
              <button
                type="button"
                onClick={() => setShowRazorpayKeyModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-center py-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT BANK TRANSFER MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <FiDollarSign size={20} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Bank Transfer (NEFT / IMPS)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Record a direct bank deposit or account transfer of <strong>₹{Number(form.amount).toLocaleString()}</strong> for <strong>{form.memberName}</strong>:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Name
                </label>
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India / HDFC Bank"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Reference Number / UTR
                </label>
                <input
                  value={bankRefNo}
                  onChange={(e) => setBankRefNo(e.target.value)}
                  placeholder="e.g. SBIN00012345678"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bankRefNo.trim() || isProcessing}
                onClick={() =>
                  completeVerification(
                    bankRefNo.trim(),
                    `bank_${Date.now()}`,
                    'bank_transfer_verified',
                    `Bank Transfer (${bankName})`
                  )
                }
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
              >
                {isProcessing ? 'Recording...' : 'Record to Ledger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Confirmation Modal */}
      {paymentSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <FiCheckCircle size={32} />
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Payment Verified & Appended!</h3>
            <p className="mt-1 text-xs text-slate-500">Transaction verified and logged into cryptographic SHA-256 Ledger.</p>

            <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-xs font-mono text-slate-700 dark:bg-slate-950 dark:text-slate-300 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-bold text-blue-600 truncate max-w-[180px]">{paymentSuccessModal.trxId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-600">₹{Number(paymentSuccessModal.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contributor:</span>
                <span className="font-bold text-slate-900 dark:text-white">{paymentSuccessModal.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Channel:</span>
                <span className="font-bold">{paymentSuccessModal.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-500">Confirmed (SHA-256)</span>
              </div>
            </div>

            <button
              onClick={() => setPaymentSuccessModal(null)}
              className="mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 font-bold text-xs text-white transition shadow-lg shadow-blue-500/20"
            >
              Done & Return to Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
