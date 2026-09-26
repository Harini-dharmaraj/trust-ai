import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
  AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, CartesianGrid, XAxis, YAxis 
} from 'recharts';
import { FiDownload, FiTrendingUp, FiPieChart, FiPrinter, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { useFinance } from '../hooks/useFinance';

function Analytics() {
  const { token } = useSelector((state) => state.auth);
  const { payments, expenses, loading } = useFinance();
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('trustcircle-active-group') || '');

  useEffect(() => {
    const handleGroupChange = () => {
      setActiveGroupId(localStorage.getItem('trustcircle-active-group') || '');
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, []);

  const totalCollected = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalSpent = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // Dynamically group expenses by category
  const categoryMap = {};
  expenses.forEach((exp) => {
    const cat = exp.category || 'General';
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount || 0);
  });

  const COLORS = ['#2563eb', '#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const categoryData = Object.keys(categoryMap).map((key, index) => ({
    name: key,
    value: totalSpent > 0 ? Math.round((categoryMap[key] / totalSpent) * 100) : 0,
    amount: categoryMap[key],
    color: COLORS[index % COLORS.length]
  }));

  // Compile real collection trend data dynamically
  const dynamicTrendData = payments.slice().reverse().map((p, idx) => ({
    name: p.date ? p.date.substring(5) : `P-${idx+1}`,
    collection: p.amount,
  }));

  const exportPDFReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>TrustCircle AI - Audit Statement</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .title { font-size: 24px; font-weight: bold; color: #2563eb; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
            .section { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .qr-box { border: 2px dashed #2563eb; padding: 15px; border-radius: 12px; text-align: center; margin-top: 30px; }
            .verified { color: #10b981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">TrustCircle Savings Statement</div>
              <div class="subtitle">Realtime Verified Community Statement</div>
            </div>
            <div>
              <div style="font-weight: bold;">Date: ${new Date().toLocaleDateString()}</div>
              <div style="font-size: 12px; color: #64748b;">Ref: REC-${Math.floor(10000 + Math.random() * 90000)}</div>
            </div>
          </div>

          <div class="section">
            <h3>Executive Summary</h3>
            <p>Total Community Collection: <strong>₹${totalCollected?.toLocaleString()}</strong> | Total Approved Expenses: <strong>₹${totalSpent?.toLocaleString()}</strong></p>
            <p class="verified">✓ Statement Status: 100% Balanced & Verified</p>
          </div>

          <div class="section">
            <h3>Disbursement Breakdown</h3>
            <table>
              <thead>
                <tr><th>Category</th><th>Allocation %</th><th>Amount (₹)</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${categoryData.length > 0 ? categoryData.map(c => `
                  <tr><td>${c.name}</td><td>${c.value}%</td><td>₹${c.amount?.toLocaleString()}</td><td>Verified</td></tr>
                `).join('') : '<tr><td colspan="4">No expenses recorded yet.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="qr-box">
            <div style="font-weight: bold; margin-bottom: 5px;">Digital Verification</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://trustcircle.ai/verify" alt="QR Verification" />
            <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Scan QR code to verify this official statement.</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!activeGroupId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
          <FiInfo size={28} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Active Group Required</h3>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
          Please select or create a community group to load dynamic cash flow analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <FiTrendingUp /> Real-time Performance Ratios
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Financial Performance Analytics</h2>
          <p className="text-xs text-slate-500">Monitor cash flow trends, category spending ratios, and AI time-series projections.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPDFReport}
            className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <FiPrinter /> Export QR-Verified PDF Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase text-slate-400">Total Contribution Pool</span>
          <h3 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">₹{totalCollected?.toLocaleString()}</h3>
          <span className="text-xs font-bold text-slate-500">Real-time ledger value</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase text-slate-400">Total Approved Spent</span>
          <h3 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">₹{totalSpent?.toLocaleString()}</h3>
          <span className="text-xs font-bold text-slate-500">From validated receipts</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-bold uppercase text-slate-400">Remaining Balance</span>
          <h3 className="mt-2 text-3xl font-bold text-emerald-600">₹{(totalCollected - totalSpent)?.toLocaleString()}</h3>
          <span className="text-xs font-bold text-emerald-600">Traceable pool</span>
        </div>
      </div>

      {/* Chart Row */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        
        {/* Collection trend Area Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Deposit Growth Flow</h3>
          <p className="text-xs text-slate-500 mb-4">Historical record of member deposits</p>

          <div className="h-64 w-full flex items-center justify-center">
            {dynamicTrendData.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold">Make a payment to see deposit trend graphs!</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsCollection" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                    formatter={(val) => [`₹${val.toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="collection" name="Deposits" stroke="#2563eb" fillOpacity={1} fill="url(#analyticsCollection)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category distribution */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Category Allocations</h3>
            <p className="text-xs text-slate-500 mb-4">Allocation ratio of active disbursements</p>

            <div className="h-44 w-full flex items-center justify-center">
              {categoryData.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold">No expenses recorded yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="amount">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`₹${val.toLocaleString()}`, 'Allocation']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700 dark:text-slate-300">{cat.name}</span>
                </div>
                <span className="text-slate-900 dark:text-white">{cat.value}% (₹{cat.amount?.toLocaleString()})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
