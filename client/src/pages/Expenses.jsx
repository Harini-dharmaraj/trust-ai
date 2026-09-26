import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useFinance } from '../hooks/useFinance';
import { FiCpu, FiCheckCircle, FiShield, FiFileText, FiUploadCloud, FiAlertTriangle, FiLock, FiInfo } from 'react-icons/fi';

function Expenses() {
  const { token, user } = useSelector((state) => state.auth);
  const { expenses, loading, refetch } = useFinance();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');
  const [noReceipt, setNoReceipt] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Travel & Transport',
    description: '',
    receipt: '',
    noReceiptReason: '',
    proofType: 'Receipt',
  });

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, []);

  const handleRunOCR = async (presetType) => {
    setOcrLoading(true);
    try {
      const response = await axios.post('/api/finance/ocr', { receiptType: presetType }, { headers: { Authorization: `Bearer ${token}` } });
      const data = response.data.data;
      setOcrResult(data);

      setNoReceipt(false);
      setForm((prev) => ({
        ...prev,
        title: `${data.category} - ${data.vendorName}`,
        amount: data.amount,
        category: data.category,
        description: `Verified Invoice (GSTIN: ${data.gstNumber})`,
        receipt: `REC_OCR_${Math.floor(10000 + Math.random() * 90000)}.pdf`,
        proofType: 'Invoice',
      }));
      setMessage('AI OCR scanned & auto-filled form details successfully!');
    } catch (error) {
      setMessage('Failed to execute AI OCR.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeGroupId) {
      setMessage('Please select an active group first.');
      return;
    }

    if (noReceipt && !form.noReceiptReason.trim()) {
      setMessage('Please enter a reason explaining the missing receipt.');
      return;
    }

    try {
      await axios.post(
        '/api/finance/expenses',
        { 
          ...form, 
          amount: Number(form.amount),
          proofType: noReceipt ? 'Declaration' : 'Receipt',
          receipt: noReceipt ? '' : form.receipt,
          noReceiptReason: noReceipt ? form.noReceiptReason : '',
          groupId: activeGroupId 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Expense entry saved to cryptographic ledger!');
      setForm({ title: '', amount: '', category: 'Travel & Transport', description: '', receipt: '', noReceiptReason: '', proofType: 'Receipt' });
      setNoReceipt(false);
      setOcrResult(null);
      refetch();
    } catch (error) {
      setMessage('Failed to register expense.');
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
          Please select or join a community group to audit expense records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <FiCpu /> AI Receipt Scanner & Expense Auditing
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Community Expense Records</h2>
        <p className="text-xs text-slate-500">
          {isAdmin 
            ? 'Upload or select receipts for automated AI OCR text extraction, GST validation, and Fraud Risk scoring.'
            : 'Audit active community disbursements, view verified invoice receipts, and trace cryptographic proof hashes.'}
        </p>
      </div>

      {/* AI OCR Scanner Controls (Admin Only) */}
      {isAdmin && (
        <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-sky-50/50 to-white p-6 dark:border-blue-900 dark:from-slate-900 dark:to-slate-950 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md">
                <FiCpu size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Instant OCR Receipt Scanner</h3>
                <p className="text-xs text-slate-500">Select a receipt invoice preset to scan</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <FiCheckCircle size={12} /> Admin Privilege
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {['bus', 'hall', 'medical', 'catering'].map((preset) => {
              const label = preset === 'bus' ? 'Bus Booking' : preset === 'hall' ? 'Hall Rental' : preset === 'medical' ? 'Medical Supplies' : 'Event Catering';
              const amt = preset === 'bus' ? '18,000' : preset === 'hall' ? '25,000' : preset === 'medical' ? '4,500' : '14,200';
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleRunOCR(preset)}
                  disabled={ocrLoading}
                  className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-white p-3 text-left text-xs font-bold text-slate-700 shadow-sm hover:border-blue-500 hover:shadow transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <span className="text-lg">📁</span>
                  <div>
                    <p className="font-bold">{label}</p>
                    <p className="text-[10px] text-slate-400">₹{amt} Invoice Preset</p>
                  </div>
                </button>
              );
            })}
          </div>

          {ocrResult && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-emerald-800 dark:text-emerald-200">
                <span className="flex items-center gap-1">
                  <FiCheckCircle /> AI OCR Extraction Result
                </span>
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] text-white">
                  Confidence: {ocrResult.confidenceScore}
                </span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3 text-slate-700 dark:text-slate-300">
                <div>Vendor: <strong>{ocrResult.vendorName}</strong></div>
                <div>Amount: <strong>₹{ocrResult.amount?.toLocaleString()}</strong></div>
                <div>GSTIN: <strong>{ocrResult.gstNumber}</strong></div>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                🛡️ Fraud Risk Score: {ocrResult.fraudRiskScore} — Verified against duplicate invoice registries.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expense Form & Table */}
      <div className={isAdmin ? "grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" : "max-w-3xl mx-auto"}>
        {/* Form Card (Admin Only) */}
        {isAdmin && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Approved Expense</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Title</label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Expense Title (e.g., Bus Booking)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Travel & Transport">Travel & Transport</option>
                    <option value="Venue & Events">Venue & Events</option>
                    <option value="Medical & Emergency">Medical & Emergency</option>
                    <option value="Food & Catering">Food & Catering</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="General Maintenance">General Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Toggle No-Receipt Checkbox */}
              <div className="flex items-center gap-2 py-1.5">
                <input
                  type="checkbox"
                  id="noReceiptCheck"
                  checked={noReceipt}
                  onChange={(e) => setNoReceipt(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="noReceiptCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  ⚠️ I don't have an invoice/receipt for this expense
                </label>
              </div>

              {noReceipt ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Missing Receipt</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Provide justification (e.g. Paid cash to local taxi driver, no receipt provided)."
                    rows={2}
                    value={form.noReceiptReason}
                    onChange={(e) => setForm({ ...form, noReceiptReason: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Invoice Receipt Reference ID</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Receipt File ID / Invoice ID"
                    value={form.receipt}
                    onChange={(e) => setForm({ ...form, receipt: e.target.value })}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Justification / Notes</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Expense description & details"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <button
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-xs text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
                type="submit"
              >
                Save Expense to SHA-256 Ledger
              </button>
            </form>

            {message && (
              <p className="mt-3 rounded-xl bg-blue-50 p-2.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium text-center">
                {message}
              </p>
            )}
          </div>
        )}

        {/* Expenses List Card (Visible to All) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Audited Expense Ledger</h3>
            {!isAdmin && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <FiLock size={12} /> Read Only
              </span>
            )}
          </div>

          {expenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
                <FiFileText size={24} />
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No Expense Entries</h4>
              <p className="mt-1 text-xs text-slate-500">
                {isAdmin ? 'Record a transaction or scan a receipt to log the first expense.' : 'Wait for the Group Admin to record approved disbursements.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {expenses.map((expense) => (
                <div
                  key={expense._id || expense.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{expense.title}</h4>
                      <p className="text-[11px] text-slate-500">{expense.category} • {expense.description}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
                      {expense.status || 'Approved'}
                    </span>
                  </div>
                  
                  {expense.noReceiptReason ? (
                    <div className="mt-2.5 rounded-xl bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-800 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40">
                      ⚠️ No Receipt Declaration: {expense.noReceiptReason}
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Amount: ₹{expense.amount?.toLocaleString()}</span>
                    <span className="text-[11px] text-blue-600 font-mono">
                      {expense.noReceiptReason ? 'Declaration Signed' : `Ref: ${expense.receipt || 'REC_VERIFIED.pdf'}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Expenses;
